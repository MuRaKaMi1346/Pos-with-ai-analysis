"""Order creation + totals computation.

Spec section 4 (Database) — atomic stock deduction per BOM:

    เมื่อสร้าง Order:
      สำหรับแต่ละ OrderItem:
        ดึง Recipe ของ product นั้น
        สำหรับแต่ละบรรทัดสูตร:
          ลด StockLevel ของ ingredient ตาม (qty ในสูตร x จำนวนที่สั่ง)
          บันทึก StockMovement type=sale
      ทำใน transaction เดียว (ถ้าพังให้ rollback ทั้งหมด)

M1 (`pos-pro-upgrade` §2.1) adds the totals breakdown, channel + table,
and a human-friendly per-day rolling ``order_number`` (``YYYYMMDD-NNNN``).

``calculate_totals`` is the **only** place totals are derived (per the
pro-upgrade spec §4). Discounts (M4), shifts (M8), and split bills (M3)
extend this helper without forking it.
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
from app.core.exceptions import ConflictError, NotFoundError
from app.models import (
    Ingredient,
    Modifier,
    MovementType,
    Order,
    OrderItem,
    OrderItemModifier,
    OrderStatus,
    Product,
    StockLevel,
    StockMovement,
)
from app.repositories import inventory_repo, order_repo
from app.schemas.order import OrderCreate
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
    """Compute the bill breakdown from a subtotal + settings snapshot.

    M1: discount_total defaults to 0; M4 will populate it from
    ``OrderDiscount`` / ``OrderItemDiscount`` rows.

    Tax-inclusive (Thai default): line prices already include VAT, so the
    grand total is ``subtotal + service - discount + tip + rounding``; we
    only *extract* ``tax_total`` for the receipt by ``base - base/(1+rate)``.

    Tax-exclusive: VAT is added on top. ``service_charge_before_vat`` toggles
    whether service is computed on the pre- or post-VAT amount.
    """
    discount_total = _q(discount_total)
    base = subtotal - discount_total  # discounted subtotal
    service_rate = settings.pos_service_charge_rate
    tax_rate = settings.pos_tax_rate
    tax_inclusive = settings.pos_tax_inclusive
    service_first = settings.pos_service_charge_before_vat

    if tax_inclusive:
        service_charge = _q(base * service_rate)
        gross_pre_tip = base + service_charge
        # Extract VAT from the inclusive amount for receipt reporting.
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

    # Rounding
    if settings.pos_rounding_mode == "NEAREST_BAHT":
        total = total_unrounded.quantize(_WHOLE, rounding=ROUND_HALF_UP)
        rounding_adjustment = total - total_unrounded
    else:  # TWO_DECIMALS (default)
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


# ── Order number ────────────────────────────────────────────────────


def _next_order_number(session: Session, now: datetime) -> str:
    """Return next per-day rolling number like ``20260528-0042``.

    Reads ``MAX(SUBSTR(order_number, 10) AS INTEGER)`` for today's prefix.
    A UNIQUE constraint on ``order_number`` is the ultimate safety net —
    ``create_order`` catches the rare race-loss and retries.
    """
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


# ── Read helpers (unchanged) ────────────────────────────────────────


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


# ── Create ──────────────────────────────────────────────────────────


def create_order(
    session: Session,
    *,
    user_id: int,
    payload: OrderCreate,
    settings: Settings,
) -> Order:
    """Create Order + items + deduct stock per BOM. All-or-nothing.

    M1 changes:
    - Sets ``order_number`` / ``channel`` / ``table_number``.
    - Records the totals breakdown (subtotal, service, tax, tip, total).
    - Stock-deduction timing unchanged in M1 (will move to send-to-kitchen
      in M3 — see milestone plan).
    """
    items_in = payload.items

    # ── 1. Resolve products + compute ingredient requirements ────────
    products_by_id: dict[int, Product] = {}
    requirements: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))

    for item_in in items_in:
        product = session.get(Product, item_in.product_id)
        if product is None or not product.is_active:
            raise NotFoundError(f"product_not_found:{item_in.product_id}")
        products_by_id[product.id] = product  # type: ignore[index]
        for recipe in product.recipes:
            requirements[recipe.ingredient_id] += recipe.qty * item_in.qty

    # ── 2. Stock availability check (no writes yet) ──────────────────
    stocks_by_ingredient: dict[int, StockLevel] = {}
    for ingredient_id, required in requirements.items():
        stock = inventory_repo.get_stock(session, ingredient_id)
        if stock is None or stock.quantity < required:
            ingredient = session.get(Ingredient, ingredient_id)
            name = ingredient.name if ingredient else f"ingredient:{ingredient_id}"
            raise ConflictError(f"insufficient_stock:{name}")
        stocks_by_ingredient[ingredient_id] = stock

    # ── 3. Resolve modifiers (need price_delta snapshot) ─────────────
    modifiers_by_id: dict[int, Modifier] = {}
    for item_in in items_in:
        for mod_id in item_in.modifier_ids:
            if mod_id in modifiers_by_id:
                continue
            modifier = session.get(Modifier, mod_id)
            if modifier is None:
                raise NotFoundError(f"modifier_not_found:{mod_id}")
            modifiers_by_id[mod_id] = modifier

    # ── 4. Build subtotal up-front so we can populate the snapshot ──
    subtotal = Decimal("0.00")
    for item_in in items_in:
        product = products_by_id[item_in.product_id]
        line = product.price * item_in.qty
        for mod_id in item_in.modifier_ids:
            line += modifiers_by_id[mod_id].price_delta * item_in.qty
        subtotal += line

    breakdown = calculate_totals(subtotal, tip=payload.tip, settings=settings)

    # ── 5. Insert the Order with order_number — retry on UNIQUE race ─
    now = now_utc()
    order = _insert_order_with_number(
        session,
        user_id=user_id,
        payload=payload,
        breakdown=breakdown,
        now=now,
    )
    assert order.id is not None

    # ── 6. Insert items + item modifiers ─────────────────────────────
    for item_in in items_in:
        product = products_by_id[item_in.product_id]
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,  # type: ignore[arg-type]
            qty=item_in.qty,
            unit_price=product.price,
        )
        session.add(item)
        session.flush()  # populate item.id
        assert item.id is not None
        for mod_id in item_in.modifier_ids:
            session.add(
                OrderItemModifier(
                    order_item_id=item.id,
                    modifier_id=mod_id,
                    price_delta=modifiers_by_id[mod_id].price_delta,
                )
            )

    # ── 7. Deduct stock + record sale movements ──────────────────────
    for ingredient_id, required in requirements.items():
        stock = stocks_by_ingredient[ingredient_id]
        stock.quantity = stock.quantity - required
        stock.updated_at = now
        session.add(stock)
        session.add(
            StockMovement(
                ingredient_id=ingredient_id,
                type=MovementType.SALE,
                qty=-required,
                ref=f"order:{order.id}",
                user_id=user_id,
            )
        )

    # ── 8. Commit once at the end ────────────────────────────────────
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
    """Race-safe Order insert. Retries on UNIQUE(order_number) collision."""
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
