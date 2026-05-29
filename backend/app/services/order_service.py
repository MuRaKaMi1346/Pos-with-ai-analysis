"""Order lifecycle + totals computation.

State machine (M3):

    POST /orders/           → status=OPEN, no stock action
        ↕ hold / resume     status flips OPEN ↔ HOLD (still no stock)
    PATCH /orders/{id}/items  replace lines (only pre-send, status OPEN|HOLD)
    POST .../send-to-kitchen  stock check + deduction in one txn;
                              sets sent_to_kitchen_at; items PENDING→PREPARING
    POST .../items/{id}/void  reverse that line's stock (if sent),
                              mark is_voided + kitchen_status=CANCELLED
    POST .../void             reverse remaining stock (if sent),
                              status=VOIDED + audit fields

``calculate_totals`` remains the only place totals are derived
(pro-upgrade §4). Subsequent milestones layer in discounts (M4),
payments (M5), refunds (M6), shifts (M8) without forking this helper.
"""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import text
from sqlmodel import Session

from app.core.config import Settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models import (
    DiscountType,
    Ingredient,
    KitchenStatus,
    Modifier,
    MovementType,
    Order,
    OrderItem,
    OrderItemModifier,
    OrderStatus,
    Product,
    Role,
    StockLevel,
    StockMovement,
    User,
)
from app.repositories import inventory_repo, order_repo
from app.schemas.order import OrderCreate, OrderItemsReplace
from app.utils.datetime import now_utc

_TWO_DP = Decimal("0.01")
_WHOLE = Decimal("1")
_ORDER_NUMBER_MAX_RETRIES = 5


# ── Totals breakdown ────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class TotalsBreakdown:
    """Pure value object — what ``calculate_totals`` returns."""

    subtotal: Decimal
    discount_total: Decimal
    service_charge: Decimal
    service_charge_rate: Decimal
    tax_total: Decimal
    tax_rate: Decimal
    tax_inclusive: bool
    tip_total: Decimal
    rounding_adjustment: Decimal
    total: Decimal


def _q(amount: Decimal) -> Decimal:
    return amount.quantize(_TWO_DP, rounding=ROUND_HALF_UP)


def calculate_totals(
    subtotal: Decimal,
    *,
    tip: Decimal = Decimal("0.00"),
    discount_total: Decimal = Decimal("0.00"),
    settings: Settings,
) -> TotalsBreakdown:
    """Compute the bill breakdown from a subtotal + settings snapshot."""
    discount_total = _q(discount_total)
    base = subtotal - discount_total
    service_rate = settings.pos_service_charge_rate
    tax_rate = settings.pos_tax_rate
    tax_inclusive = settings.pos_tax_inclusive
    service_first = settings.pos_service_charge_before_vat

    if tax_inclusive:
        service_charge = _q(base * service_rate)
        gross_pre_tip = base + service_charge
        tax_total = (
            _q(gross_pre_tip - gross_pre_tip / (Decimal("1") + tax_rate))
            if tax_rate > 0
            else Decimal("0.00")
        )
        total_unrounded = gross_pre_tip + tip
    else:
        if service_first:
            service_charge = _q(base * service_rate)
            tax_total = _q((base + service_charge) * tax_rate)
        else:
            tax_total = _q(base * tax_rate)
            service_charge = _q((base + tax_total) * service_rate)
        total_unrounded = base + service_charge + tax_total + tip

    if settings.pos_rounding_mode == "NEAREST_BAHT":
        total = total_unrounded.quantize(_WHOLE, rounding=ROUND_HALF_UP)
        rounding_adjustment = total - total_unrounded
    else:
        total = _q(total_unrounded)
        rounding_adjustment = Decimal("0.00")

    return TotalsBreakdown(
        subtotal=_q(subtotal),
        discount_total=discount_total,
        service_charge=service_charge,
        service_charge_rate=service_rate,
        tax_total=tax_total,
        tax_rate=tax_rate,
        tax_inclusive=tax_inclusive,
        tip_total=_q(tip),
        rounding_adjustment=_q(rounding_adjustment),
        total=_q(total),
    )


def _apply_breakdown(order: Order, breakdown: TotalsBreakdown) -> None:
    """Persist a fresh ``TotalsBreakdown`` back onto the Order columns."""
    order.subtotal = breakdown.subtotal
    order.discount_total = breakdown.discount_total
    order.service_charge = breakdown.service_charge
    order.service_charge_rate = breakdown.service_charge_rate
    order.tax_total = breakdown.tax_total
    order.tax_rate = breakdown.tax_rate
    order.tax_inclusive = breakdown.tax_inclusive
    order.tip_total = breakdown.tip_total
    order.rounding_adjustment = breakdown.rounding_adjustment
    order.total = breakdown.total


# ── Order number ────────────────────────────────────────────────────


def _next_order_number(session: Session, now: datetime) -> str:
    """Per-day rolling number ``YYYYMMDD-NNNN``. UNIQUE acts as a tiebreaker."""
    prefix = now.strftime("%Y%m%d")
    row = session.execute(
        text(
            "SELECT MAX(CAST(SUBSTR(order_number, 10) AS INTEGER)) "
            "FROM orders WHERE order_number LIKE :pfx"
        ),
        {"pfx": f"{prefix}-%"},
    ).scalar()
    next_n = (int(row) if row else 0) + 1
    return f"{prefix}-{next_n:04d}"


# ── Read helpers ────────────────────────────────────────────────────


def get_or_404(session: Session, order_id: int) -> Order:
    order = order_repo.repository.get(session, order_id)
    if order is None:
        raise NotFoundError("order_not_found")
    return order


def list_recent(
    session: Session,
    *,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Order]:
    return order_repo.list_recent(session, user_id=user_id, offset=offset, limit=limit)


# ── Recipe walking helpers ──────────────────────────────────────────


def _line_requirements(item: OrderItem, *, qty: int | None = None) -> dict[int, Decimal]:
    """How much of each ingredient ``qty`` units of an OrderItem consume.

    ``qty=None`` (default) uses the full ``item.qty`` — that's the original
    send-to-kitchen / void-line callers. M6 refund passes a partial qty.
    """
    effective_qty = qty if qty is not None else item.qty
    reqs: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    if item.product is not None:
        for recipe in item.product.recipes:
            reqs[recipe.ingredient_id] += recipe.qty * effective_qty
    for oim in item.modifiers:
        if oim.modifier is None:
            continue
        for recipe in oim.modifier.recipes:
            reqs[recipe.ingredient_id] += recipe.qty * effective_qty
    return reqs


def _sum_requirements(items: Sequence[OrderItem]) -> dict[int, Decimal]:
    total: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    for item in items:
        if item.is_voided:
            continue
        for ingredient_id, qty in _line_requirements(item).items():
            total[ingredient_id] += qty
    return total


def _subtotal_from_items(items: Sequence[OrderItem]) -> Decimal:
    subtotal = Decimal("0.00")
    for item in items:
        if item.is_voided:
            continue
        line = item.unit_price * item.qty
        for oim in item.modifiers:
            line += oim.price_delta * item.qty
        subtotal += line
    return subtotal


def _line_subtotal(item: OrderItem) -> Decimal:
    """Single line subtotal (pre-discount)."""
    line = item.unit_price * item.qty
    for oim in item.modifiers:
        line += oim.price_delta * item.qty
    return line


def _compute_discount_total(order: Order) -> Decimal:
    """Recompute every snapshot's ``amount_off`` against current bill state.

    M4 stacking order: item discounts first (per line, capped at line
    subtotal), then order discounts on the post-item-discount base
    (each capped at its master ``max_discount_amount`` and the running
    remainder so totals can't go negative). Voided line discounts stay
    in the DB for audit but don't contribute.
    """
    item_total = Decimal("0.00")
    for item in order.items:
        if item.is_voided:
            continue
        line_base = _q(_line_subtotal(item))
        line_discount = Decimal("0.00")
        for d in item.discounts:
            remaining = line_base - line_discount
            amount = _q(line_base * d.value if d.type == DiscountType.PERCENT else d.value)
            if amount > remaining:
                amount = remaining
            if amount < Decimal("0"):
                amount = Decimal("0.00")
            d.amount_off = amount
            line_discount += amount
        item_total += line_discount

    bill_subtotal = _q(_subtotal_from_items(order.items))
    order_base = bill_subtotal - item_total
    order_total = Decimal("0.00")
    for od in order.discounts:
        remaining = order_base - order_total
        amount = _q(order_base * od.value if od.type == DiscountType.PERCENT else od.value)
        # Per-row master cap is applied in ``_apply_master_caps`` afterwards.
        if amount > remaining:
            amount = remaining
        if amount < Decimal("0"):
            amount = Decimal("0.00")
        od.amount_off = amount
        order_total += amount

    return item_total + order_total


def _apply_master_caps(session: Session, order: Order) -> None:
    """Apply ``max_discount_amount`` from the master Discount to OrderDiscount rows.

    Called after ``_compute_discount_total`` so percent calculations are
    finalized; we then trim any row that exceeds its master cap and let
    the caller redo the total (cheap — two passes).
    """
    from app.models import Discount

    changed = False
    for d in order.discounts:
        if d.discount_id is None:
            continue
        master = session.get(Discount, d.discount_id)
        if master is None or master.max_discount_amount is None:
            continue
        if d.amount_off > master.max_discount_amount:
            d.amount_off = master.max_discount_amount
            changed = True
    if not changed:
        return
    # Second pass: re-sum order discounts to cap stacking.
    bill_subtotal = _q(_subtotal_from_items(order.items))
    item_total = sum(
        (d.amount_off for item in order.items if not item.is_voided for d in item.discounts),
        Decimal("0.00"),
    )
    order_base = bill_subtotal - item_total
    running = Decimal("0.00")
    for d in order.discounts:
        cap_remaining = order_base - running
        if d.amount_off > cap_remaining:
            d.amount_off = max(cap_remaining, Decimal("0.00"))
        running += d.amount_off


def recompute_totals(session: Session, order: Order, settings: Settings) -> None:
    """Recompute ``discount_total`` then the rest of the breakdown; persist."""
    _compute_discount_total(order)
    _apply_master_caps(session, order)
    discount_total = sum(
        (d.amount_off for item in order.items if not item.is_voided for d in item.discounts),
        Decimal("0.00"),
    ) + sum((d.amount_off for d in order.discounts), Decimal("0.00"))
    breakdown = calculate_totals(
        _subtotal_from_items(order.items),
        tip=order.tip_total,
        discount_total=discount_total,
        settings=settings,
    )
    _apply_breakdown(order, breakdown)
    order.updated_at = now_utc()
    session.add(order)


def _check_and_deduct_stock(
    session: Session,
    requirements: dict[int, Decimal],
    *,
    order_id: int,
    user_id: int,
    now: datetime,
    movement_ref_prefix: str = "order",
) -> None:
    """Validate availability then write StockMovements + decrement StockLevel."""
    stocks: dict[int, StockLevel] = {}
    for ingredient_id, required in requirements.items():
        stock = inventory_repo.get_stock(session, ingredient_id)
        if stock is None or stock.quantity < required:
            ingredient = session.get(Ingredient, ingredient_id)
            name = ingredient.name if ingredient else f"ingredient:{ingredient_id}"
            raise ConflictError(f"insufficient_stock:{name}")
        stocks[ingredient_id] = stock

    for ingredient_id, required in requirements.items():
        stock = stocks[ingredient_id]
        stock.quantity = stock.quantity - required
        stock.updated_at = now
        session.add(stock)
        session.add(
            StockMovement(
                ingredient_id=ingredient_id,
                type=MovementType.SALE,
                qty=-required,
                ref=f"{movement_ref_prefix}:{order_id}",
                user_id=user_id,
            )
        )


def _reverse_stock(
    session: Session,
    requirements: dict[int, Decimal],
    *,
    order_id: int,
    user_id: int,
    now: datetime,
    movement_ref: str,
) -> None:
    """Add back ingredient quantities + write RETURN movements."""
    for ingredient_id, qty in requirements.items():
        stock = inventory_repo.get_stock(session, ingredient_id)
        if stock is None:
            stock = StockLevel(ingredient_id=ingredient_id, quantity=Decimal("0"))
            session.add(stock)
            session.flush()
        stock.quantity = stock.quantity + qty
        stock.updated_at = now
        session.add(stock)
        session.add(
            StockMovement(
                ingredient_id=ingredient_id,
                type=MovementType.RETURN,
                qty=qty,
                ref=movement_ref,
                user_id=user_id,
            )
        )


# ── Create ──────────────────────────────────────────────────────────


def create_order(
    session: Session,
    *,
    user_id: int,
    payload: OrderCreate,
    settings: Settings,
) -> Order:
    """Open a new bill. No stock check / deduction — those move to send-to-kitchen (M3)."""
    items_in = payload.items

    products_by_id: dict[int, Product] = {}
    for item_in in items_in:
        product = session.get(Product, item_in.product_id)
        if product is None or not product.is_active:
            raise NotFoundError(f"product_not_found:{item_in.product_id}")
        products_by_id[product.id] = product  # type: ignore[index]

    modifiers_by_id: dict[int, Modifier] = {}
    for item_in in items_in:
        for mod_id in item_in.modifier_ids:
            if mod_id in modifiers_by_id:
                continue
            modifier = session.get(Modifier, mod_id)
            if modifier is None:
                raise NotFoundError(f"modifier_not_found:{mod_id}")
            modifiers_by_id[mod_id] = modifier

    subtotal = Decimal("0.00")
    for item_in in items_in:
        product = products_by_id[item_in.product_id]
        line = product.price * item_in.qty
        for mod_id in item_in.modifier_ids:
            line += modifiers_by_id[mod_id].price_delta * item_in.qty
        subtotal += line

    breakdown = calculate_totals(subtotal, tip=payload.tip, settings=settings)
    now = now_utc()
    order = _insert_order_with_number(
        session,
        user_id=user_id,
        payload=payload,
        breakdown=breakdown,
        now=now,
    )
    assert order.id is not None

    for item_in in items_in:
        product = products_by_id[item_in.product_id]
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,  # type: ignore[arg-type]
            qty=item_in.qty,
            unit_price=product.price,
        )
        session.add(item)
        session.flush()
        assert item.id is not None
        for mod_id in item_in.modifier_ids:
            session.add(
                OrderItemModifier(
                    order_item_id=item.id,
                    modifier_id=mod_id,
                    price_delta=modifiers_by_id[mod_id].price_delta,
                )
            )

    session.commit()
    session.refresh(order)
    return order


def _insert_order_with_number(
    session: Session,
    *,
    user_id: int,
    payload: OrderCreate,
    breakdown: TotalsBreakdown,
    now: datetime,
) -> Order:
    last_err: IntegrityError | None = None
    for _ in range(_ORDER_NUMBER_MAX_RETRIES):
        order = Order(
            order_number=_next_order_number(session, now),
            channel=payload.channel,
            table_number=payload.table_number,
            user_id=user_id,
            status=OrderStatus.OPEN,
            note=payload.note,
            subtotal=breakdown.subtotal,
            discount_total=breakdown.discount_total,
            service_charge=breakdown.service_charge,
            service_charge_rate=breakdown.service_charge_rate,
            tax_total=breakdown.tax_total,
            tax_rate=breakdown.tax_rate,
            tax_inclusive=breakdown.tax_inclusive,
            tip_total=breakdown.tip_total,
            rounding_adjustment=breakdown.rounding_adjustment,
            total=breakdown.total,
            created_at=now,
            updated_at=now,
        )
        session.add(order)
        try:
            session.flush()
        except IntegrityError as exc:
            last_err = exc
            session.rollback()
            continue
        return order
    raise ConflictError("order_number_collision") from last_err


# ── Lifecycle: hold / resume ────────────────────────────────────────


def hold_order(session: Session, order: Order) -> Order:
    if order.status != OrderStatus.OPEN:
        raise ConflictError(f"cannot_hold_status:{order.status}")
    if order.sent_to_kitchen_at is not None:
        raise ConflictError("cannot_hold_after_send")
    order.status = OrderStatus.HOLD
    order.updated_at = now_utc()
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


def resume_order(session: Session, order: Order) -> Order:
    if order.status != OrderStatus.HOLD:
        raise ConflictError(f"cannot_resume_status:{order.status}")
    order.status = OrderStatus.OPEN
    order.updated_at = now_utc()
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ── Lifecycle: replace items (PATCH /items) ─────────────────────────


def replace_items(
    session: Session,
    order: Order,
    payload: OrderItemsReplace,
    settings: Settings,
) -> Order:
    """Diff-and-replace the bill's items. Allowed only pre-send (OPEN | HOLD).

    Each incoming line with an ``id`` updates the matching live (non-voided)
    line in place. Lines without an ``id`` are appended. Live lines absent
    from the payload are hard-deleted (no audit needed pre-send). Voided
    lines are left untouched (audit).
    """
    if order.status not in {OrderStatus.OPEN, OrderStatus.HOLD}:
        raise ConflictError(f"cannot_edit_status:{order.status}")
    if order.sent_to_kitchen_at is not None:
        raise ConflictError("cannot_edit_after_send")

    live_by_id: dict[int, OrderItem] = {
        item.id: item for item in order.items if item.id is not None and not item.is_voided
    }
    incoming_ids = {p.id for p in payload.items if p.id is not None}
    unknown = incoming_ids - live_by_id.keys()
    if unknown:
        raise NotFoundError(f"order_item_not_found:{next(iter(unknown))}")

    # ── 1. Resolve products + modifiers once for the whole payload ──
    products_by_id: dict[int, Product] = {}
    modifiers_by_id: dict[int, Modifier] = {}
    for line in payload.items:
        product = session.get(Product, line.product_id)
        if product is None or not product.is_active:
            raise NotFoundError(f"product_not_found:{line.product_id}")
        products_by_id[line.product_id] = product
        for mod_id in line.modifier_ids:
            if mod_id in modifiers_by_id:
                continue
            modifier = session.get(Modifier, mod_id)
            if modifier is None:
                raise NotFoundError(f"modifier_not_found:{mod_id}")
            modifiers_by_id[mod_id] = modifier

    # ── 2. Delete live lines absent from the new list ───────────────
    keep_ids = {p.id for p in payload.items if p.id is not None}
    for live_id, item in live_by_id.items():
        if live_id in keep_ids:
            continue
        # Hard-delete the modifiers first to clear the FK refs.
        for oim in list(item.modifiers):
            session.delete(oim)
        session.delete(item)

    # ── 3. Update kept lines + append new ones ──────────────────────
    assert order.id is not None
    for line in payload.items:
        product = products_by_id[line.product_id]
        if line.id is not None:
            item = live_by_id[line.id]
            item.product_id = product.id  # type: ignore[assignment]
            item.qty = line.qty
            item.unit_price = product.price
            # Replace modifiers wholesale rather than diffing — POS UI
            # treats the modifier set as one-shot per line.
            for oim in list(item.modifiers):
                session.delete(oim)
            session.flush()
            assert item.id is not None
            for mod_id in line.modifier_ids:
                session.add(
                    OrderItemModifier(
                        order_item_id=item.id,
                        modifier_id=mod_id,
                        price_delta=modifiers_by_id[mod_id].price_delta,
                    )
                )
        else:
            new_item = OrderItem(
                order_id=order.id,
                product_id=product.id,  # type: ignore[arg-type]
                qty=line.qty,
                unit_price=product.price,
            )
            session.add(new_item)
            session.flush()
            assert new_item.id is not None
            for mod_id in line.modifier_ids:
                session.add(
                    OrderItemModifier(
                        order_item_id=new_item.id,
                        modifier_id=mod_id,
                        price_delta=modifiers_by_id[mod_id].price_delta,
                    )
                )

    session.flush()
    session.refresh(order)
    # ── 4. Recompute totals (incl. discount snapshot rebuild) ───────
    recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order


# ── Lifecycle: send to kitchen ──────────────────────────────────────


def send_to_kitchen(session: Session, order: Order, *, user_id: int) -> Order:
    if order.status != OrderStatus.OPEN:
        raise ConflictError(f"cannot_send_status:{order.status}")
    if order.sent_to_kitchen_at is not None:
        raise ConflictError("already_sent_to_kitchen")
    live_items = [item for item in order.items if not item.is_voided]
    if not live_items:
        raise ConflictError("empty_bill")

    assert order.id is not None
    now = now_utc()
    requirements = _sum_requirements(live_items)
    _check_and_deduct_stock(
        session,
        requirements,
        order_id=order.id,
        user_id=user_id,
        now=now,
    )

    order.sent_to_kitchen_at = now
    order.updated_at = now
    for item in live_items:
        item.kitchen_status = KitchenStatus.PREPARING
        session.add(item)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


# ── Lifecycle: void line / void bill ────────────────────────────────


def _require_admin(actor: User, code: str) -> None:
    if actor.role != Role.ADMIN:
        raise ForbiddenError(code)


def void_item(
    session: Session,
    order: Order,
    item_id: int,
    *,
    reason: str,
    actor: User,
    settings: Settings,
) -> Order:
    item = next((i for i in order.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("order_item_not_found")
    if item.is_voided:
        raise ConflictError("item_already_voided")
    if order.status in {OrderStatus.VOIDED, OrderStatus.PAID, OrderStatus.REFUNDED}:
        raise ConflictError(f"cannot_void_item_status:{order.status}")

    sent = order.sent_to_kitchen_at is not None
    if sent:
        _require_admin(actor, "void_after_send_admin_only")

    assert order.id is not None
    assert actor.id is not None
    now = now_utc()

    if sent:
        requirements = _line_requirements(item)
        _reverse_stock(
            session,
            requirements,
            order_id=order.id,
            user_id=actor.id,
            now=now,
            movement_ref=f"void_item:{item_id}",
        )

    item.is_voided = True
    item.voided_reason = reason
    item.kitchen_status = KitchenStatus.CANCELLED
    session.add(item)

    recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order


def void_order(
    session: Session,
    order: Order,
    *,
    reason: str,
    actor: User,
) -> Order:
    _require_admin(actor, "void_admin_only")
    if order.status in {OrderStatus.VOIDED, OrderStatus.PAID, OrderStatus.REFUNDED}:
        raise ConflictError(f"cannot_void_status:{order.status}")

    assert order.id is not None
    assert actor.id is not None
    now = now_utc()

    if order.sent_to_kitchen_at is not None:
        live_items = [item for item in order.items if not item.is_voided]
        requirements = _sum_requirements(live_items)
        if requirements:
            _reverse_stock(
                session,
                requirements,
                order_id=order.id,
                user_id=actor.id,
                now=now,
                movement_ref=f"void_order:{order.id}",
            )
        for item in live_items:
            item.kitchen_status = KitchenStatus.CANCELLED
            session.add(item)

    order.status = OrderStatus.VOIDED
    order.voided_at = now
    order.voided_by_user_id = actor.id
    order.void_reason = reason
    order.updated_at = now
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
