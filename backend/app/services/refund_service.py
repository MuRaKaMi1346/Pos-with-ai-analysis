"""Refund service (M6).

A refund cherry-picks one or more lines on a ``PAID`` (or
``PARTIALLY_REFUNDED``) bill, computes the cash-back amount per line, and:

1. Persists ``Refund`` + ``RefundItem`` rows.
2. Reverses stock for ``restock=true`` lines via ``MovementType.RETURN``
   (aggregated per ingredient; one ``StockMovement`` per ingredient,
   referenced by ``refund:<id>``).
3. Writes a negative-amount ``Payment`` row with ``is_refund=true``,
   attributed to the bill's first non-refund tender method.
4. Flips the parent ``Order.status`` to ``PARTIALLY_REFUNDED`` (some of
   the bill returned) or ``REFUNDED`` (cumulative refund == order.total).
5. Appends an ``AuditLog`` entry.

Refund amount per line (M6 simple formula):
    amount = unit_price * refund_qty + sum(mod.price_delta * refund_qty)

— pre-discount list price scaled to the refund qty. Fair-share with
order-level discount adjustment is deferred to M6.x.
"""

from collections import defaultdict
from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import text
from sqlmodel import Session

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models import (
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    Refund,
    RefundItem,
    Role,
    User,
)
from app.repositories import refund_repo
from app.schemas.refund import RefundCreate
from app.services import audit_service, order_service, shift_service
from app.utils.datetime import now_utc

_REFUND_NUMBER_MAX_RETRIES = 5


# ── Read ────────────────────────────────────────────────────────────


def get_or_404(session: Session, refund_id: int) -> Refund:
    refund = refund_repo.repository.get(session, refund_id)
    if refund is None:
        raise NotFoundError("refund_not_found")
    return refund


def list_filtered(
    session: Session,
    *,
    order_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Refund]:
    return refund_repo.list_filtered(session, order_id=order_id, offset=offset, limit=limit)


# ── Refund number generator ─────────────────────────────────────────


def _next_refund_number(session: Session, now: datetime) -> str:
    """Per-day rolling ``R{YYYYMMDD}-{NNNN}`` — UNIQUE acts as tiebreaker."""
    prefix = f"R{now.strftime('%Y%m%d')}"
    row = session.execute(
        text(
            "SELECT MAX(CAST(SUBSTR(refund_number, 11) AS INTEGER)) "
            "FROM refunds WHERE refund_number LIKE :pfx"
        ),
        {"pfx": f"{prefix}-%"},
    ).scalar()
    next_n = (int(row) if row else 0) + 1
    return f"{prefix}-{next_n:04d}"


# ── Create ──────────────────────────────────────────────────────────


def _q(amount: Decimal) -> Decimal:
    from decimal import ROUND_HALF_UP

    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _already_refunded_qty(item: OrderItem) -> int:
    return sum(ri.qty for ri in item.refund_items)


def _line_amount(item: OrderItem, qty: int) -> Decimal:
    """Pre-discount list-price refund amount for ``qty`` units of ``item``."""
    per_unit = item.unit_price
    for oim in item.modifiers:
        per_unit += oim.price_delta
    return _q(per_unit * qty)


def _pick_refund_method(order: Order) -> PaymentMethod:
    """First non-refund payment's method, or CASH if the bill has none."""
    for p in order.payments:
        if not p.is_refund:
            return p.method
    return PaymentMethod.CASH


def create_refund(
    session: Session,
    payload: RefundCreate,
    *,
    actor: User,
) -> Refund:
    """Cash-back a slice (or all) of a paid bill. Atomic."""
    if actor.role != Role.ADMIN:
        raise ForbiddenError("refund_admin_only")
    assert actor.id is not None

    order = session.get(Order, payload.order_id)
    if order is None:
        raise NotFoundError("order_not_found")
    if order.status not in {OrderStatus.PAID, OrderStatus.PARTIALLY_REFUNDED}:
        raise ConflictError(f"cannot_refund_status:{order.status}")

    # ── 1. Resolve + validate per-line refund qty ───────────────────
    items_by_id: dict[int, OrderItem] = {i.id: i for i in order.items if i.id is not None}
    resolved: list[tuple[OrderItem, int, bool]] = []
    requirements: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    total_amount = Decimal("0.00")
    for line_in in payload.items:
        item = items_by_id.get(line_in.order_item_id)
        if item is None:
            raise NotFoundError(f"order_item_not_found:{line_in.order_item_id}")
        if item.is_voided:
            raise ConflictError(f"item_is_voided:{item.id}")
        remaining = item.qty - _already_refunded_qty(item)
        if line_in.qty > remaining:
            raise ConflictError(
                f"refund_qty_exceeds_remaining:item_{item.id}_remaining_{remaining}"
            )
        resolved.append((item, line_in.qty, line_in.restock))
        total_amount += _line_amount(item, line_in.qty)
        if line_in.restock:
            for ingredient_id, req_qty in order_service._line_requirements(
                item, qty=line_in.qty
            ).items():
                requirements[ingredient_id] += req_qty

    total_amount = _q(total_amount)
    # Cumulative refund cap (existing refunds + this one) ≤ order.total
    existing_refunded = sum(
        (r.amount for r in order.refunds),
        Decimal("0.00"),
    )
    if existing_refunded + total_amount > order.total:
        raise ValidationError(
            f"refund_exceeds_order_total:order_total_{order.total}_"
            f"already_refunded_{existing_refunded}_new_{total_amount}"
        )

    # ── 2. Persist Refund header (retry on UNIQUE refund_number race) ──
    assert order.id is not None
    now = now_utc()
    refund = _insert_refund_with_number(
        session,
        order_id=order.id,
        amount=total_amount,
        reason=payload.reason,
        refunded_by_user_id=actor.id,
        now=now,
    )
    assert refund.id is not None

    # M8: attribute this refund's cash-back to the actor's open shift (if any).
    shift = shift_service.get_open_for_user(session, actor.id)
    if shift is not None:
        refund.cashier_shift_id = shift.id
        session.add(refund)

    # ── 3. Persist RefundItems ──────────────────────────────────────
    for item, ri_qty, restock in resolved:
        assert item.id is not None
        session.add(
            RefundItem(
                refund_id=refund.id,
                order_item_id=item.id,
                qty=ri_qty,
                amount=_line_amount(item, ri_qty),
                restock=restock,
            )
        )
    session.flush()

    # ── 4. Reverse stock for restock=true (aggregated) ──────────────
    if requirements:
        order_service._reverse_stock(
            session,
            requirements,
            order_id=order.id,
            user_id=actor.id,
            now=now,
            movement_ref=f"refund:{refund.id}",
        )

    # ── 5. Negative Payment row attributed to the bill's first tender ──
    refund_method = _pick_refund_method(order)
    session.add(
        Payment(
            order_id=order.id,
            method=refund_method,
            amount=-total_amount,
            reference=refund.refund_number,
            is_refund=True,
            paid_at=now,
        )
    )

    # ── 6. Flip parent status ───────────────────────────────────────
    new_total_refunded = existing_refunded + total_amount
    order.status = (
        OrderStatus.REFUNDED
        if new_total_refunded >= order.total
        else OrderStatus.PARTIALLY_REFUNDED
    )
    order.updated_at = now
    session.add(order)

    # ── 7. Audit log ────────────────────────────────────────────────
    audit_service.record(
        session,
        actor=actor,
        action="refund.create",
        entity_type="order",
        entity_id=order.id,
        payload={
            "refund_id": refund.id,
            "refund_number": refund.refund_number,
            "amount": total_amount,
            "items": [
                {"order_item_id": item.id, "qty": ri_qty, "restock": restock}
                for item, ri_qty, restock in resolved
            ],
            "reason": payload.reason,
            "new_status": str(order.status),
        },
    )

    session.commit()
    session.refresh(refund)
    return refund


def _insert_refund_with_number(
    session: Session,
    *,
    order_id: int,
    amount: Decimal,
    reason: str | None,
    refunded_by_user_id: int,
    now: datetime,
) -> Refund:
    last_err: IntegrityError | None = None
    for _ in range(_REFUND_NUMBER_MAX_RETRIES):
        refund = Refund(
            order_id=order_id,
            refund_number=_next_refund_number(session, now),
            amount=amount,
            reason=reason,
            refunded_by_user_id=refunded_by_user_id,
            created_at=now,
        )
        session.add(refund)
        try:
            session.flush()
        except IntegrityError as exc:
            last_err = exc
            session.rollback()
            continue
        return refund
    raise ConflictError("refund_number_collision") from last_err
