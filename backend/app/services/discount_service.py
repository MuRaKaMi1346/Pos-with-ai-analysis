"""Discount engine — CRUD master rows + apply/remove per bill/line (M4).

Apply paths build a snapshot row (``OrderDiscount`` or
``OrderItemDiscount``) and immediately recompute the bill totals via
``order_service``. Each apply / remove writes one ``AuditLog`` entry.

Admin-threshold logic lives in ``_check_admin`` — the gate fires when:
- the master Discount has ``requires_admin=True``, OR
- a percent discount exceeds ``settings.pos_discount_admin_threshold_pct``, OR
- an amount discount exceeds ``settings.pos_discount_admin_threshold_amount``.
"""

from collections.abc import Sequence
from decimal import Decimal

from sqlmodel import Session

from app.core.config import Settings
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models import (
    Discount,
    DiscountScope,
    DiscountType,
    Order,
    OrderDiscount,
    OrderItem,
    OrderItemDiscount,
    OrderStatus,
    Role,
    User,
)
from app.repositories import discount_repo
from app.schemas.discount import (
    ApplyDiscountBody,
    DiscountCreate,
    DiscountUpdate,
)
from app.services import audit_service
from app.utils.datetime import now_utc

# ── Master CRUD ─────────────────────────────────────────────────────


def get_or_404(session: Session, discount_id: int) -> Discount:
    discount = discount_repo.repository.get(session, discount_id)
    if discount is None:
        raise NotFoundError("discount_not_found")
    return discount


def list_filtered(session: Session, *, active_only: bool = False) -> Sequence[Discount]:
    return discount_repo.list_filtered(session, active_only=active_only)


def create(session: Session, data: DiscountCreate) -> Discount:
    if data.code is not None and discount_repo.get_by_code(session, data.code) is not None:
        raise ConflictError("discount_code_exists")
    discount = Discount(**data.model_dump())
    return discount_repo.repository.save(session, discount)


def update(session: Session, discount_id: int, data: DiscountUpdate) -> Discount:
    discount = get_or_404(session, discount_id)
    fields = data.model_dump(exclude_unset=True)
    if "code" in fields and fields["code"] != discount.code:
        clash = discount_repo.get_by_code(session, fields["code"])
        if clash is not None and clash.id != discount.id:
            raise ConflictError("discount_code_exists")
    # Window sanity if both supplied
    new_starts = fields.get("starts_at", discount.starts_at)
    new_ends = fields.get("ends_at", discount.ends_at)
    if new_starts is not None and new_ends is not None and new_starts >= new_ends:
        raise ValidationError("starts_at_must_precede_ends_at")
    if discount.type == DiscountType.PERCENT:
        new_value = fields.get("value", discount.value)
        if new_value > Decimal("1"):
            raise ValidationError("percent_value_must_be_le_1")
    for key, value in fields.items():
        setattr(discount, key, value)
    discount.updated_at = now_utc()
    return discount_repo.repository.save(session, discount)


def deactivate(session: Session, discount_id: int) -> Discount:
    """Soft-delete: flip ``is_active=false`` so historical snapshots stay valid."""
    discount = get_or_404(session, discount_id)
    discount.is_active = False
    discount.updated_at = now_utc()
    return discount_repo.repository.save(session, discount)


def list_applicable(
    session: Session, *, subtotal: Decimal, scope: DiscountScope | None = None
) -> list[Discount]:
    """Currently valid discounts (active + within window + min_order_amount met)."""
    # SQLite stores datetimes naively — strip tz from both sides for comparison.
    now = now_utc().replace(tzinfo=None)
    out: list[Discount] = []
    for d in discount_repo.list_filtered(session, active_only=True):
        starts = d.starts_at.replace(tzinfo=None) if d.starts_at is not None else None
        ends = d.ends_at.replace(tzinfo=None) if d.ends_at is not None else None
        if starts is not None and starts > now:
            continue
        if ends is not None and ends < now:
            continue
        if d.min_order_amount is not None and subtotal < d.min_order_amount:
            continue
        if scope is not None and d.scope != scope:
            continue
        out.append(d)
    return out


# ── Apply / Remove ──────────────────────────────────────────────────


def _check_order_state(order: Order) -> None:
    if order.status in {OrderStatus.PAID, OrderStatus.REFUNDED, OrderStatus.VOIDED}:
        raise ConflictError(f"cannot_modify_discount_status:{order.status}")


def _check_admin(
    actor: User,
    *,
    discount_requires_admin: bool,
    discount_type: DiscountType,
    value: Decimal,
    settings: Settings,
) -> None:
    if actor.role == Role.ADMIN:
        return
    if discount_requires_admin:
        raise ForbiddenError("discount_requires_admin")
    if discount_type == DiscountType.PERCENT:
        if value > settings.pos_discount_admin_threshold_pct:
            raise ForbiddenError("discount_exceeds_pct_threshold")
    elif value > settings.pos_discount_admin_threshold_amount:
        raise ForbiddenError("discount_exceeds_amount_threshold")


def _resolve(
    session: Session, body: ApplyDiscountBody, scope: DiscountScope
) -> tuple[Discount | None, str, DiscountType, Decimal, str | None]:
    """Return (master_or_none, name, type, value, reason) for the apply call.

    Coded path looks up the master discount + uses its snapshot fields; ad-hoc
    pulls name/type/value/reason straight from the body.
    """
    if body.code is not None:
        master = discount_repo.get_by_code(session, body.code)
        if master is None or not master.is_active:
            raise NotFoundError("discount_code_not_found")
        if master.scope != scope:
            raise ConflictError(f"discount_scope_mismatch:expected_{scope}_got_{master.scope}")
        return master, master.name, master.type, master.value, body.reason
    # ad-hoc — schema validator already enforced all 4 fields are present
    assert body.name is not None
    assert body.type is not None
    assert body.value is not None
    assert body.reason is not None
    return None, body.name, body.type, body.value, body.reason


def apply_to_order(
    session: Session,
    order: Order,
    body: ApplyDiscountBody,
    *,
    actor: User,
    settings: Settings,
) -> OrderDiscount:
    _check_order_state(order)
    master, name, type_, value, reason = _resolve(session, body, DiscountScope.ORDER)
    _check_admin(
        actor,
        discount_requires_admin=master.requires_admin if master is not None else False,
        discount_type=type_,
        value=value,
        settings=settings,
    )
    if (
        master is not None
        and master.min_order_amount is not None
        and order.subtotal < master.min_order_amount
    ):
        raise ConflictError("discount_min_order_not_met")
    assert order.id is not None
    assert actor.id is not None
    row = OrderDiscount(
        order_id=order.id,
        discount_id=master.id if master is not None else None,
        name=name,
        type=type_,
        value=value,
        applied_by_user_id=actor.id,
        reason=reason,
    )
    session.add(row)
    session.flush()
    assert row.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="discount.apply.order",
        entity_type="order",
        entity_id=order.id,
        payload={
            "order_discount_id": row.id,
            "discount_id": master.id if master is not None else None,
            "name": name,
            "type": str(type_),
            "value": value,
            "reason": reason,
        },
    )
    return row


def apply_to_item(
    session: Session,
    order: Order,
    item: OrderItem,
    body: ApplyDiscountBody,
    *,
    actor: User,
    settings: Settings,
) -> OrderItemDiscount:
    _check_order_state(order)
    if item.is_voided:
        raise ConflictError("item_is_voided")
    master, name, type_, value, reason = _resolve(session, body, DiscountScope.ITEM)
    _check_admin(
        actor,
        discount_requires_admin=master.requires_admin if master is not None else False,
        discount_type=type_,
        value=value,
        settings=settings,
    )
    assert item.id is not None
    assert order.id is not None
    assert actor.id is not None
    row = OrderItemDiscount(
        order_item_id=item.id,
        discount_id=master.id if master is not None else None,
        name=name,
        type=type_,
        value=value,
        applied_by_user_id=actor.id,
        reason=reason,
    )
    session.add(row)
    session.flush()
    assert row.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="discount.apply.item",
        entity_type="order_item",
        entity_id=item.id,
        payload={
            "order_id": order.id,
            "order_item_discount_id": row.id,
            "discount_id": master.id if master is not None else None,
            "name": name,
            "type": str(type_),
            "value": value,
            "reason": reason,
        },
    )
    return row


def remove_from_order(
    session: Session, order: Order, order_discount_id: int, *, actor: User
) -> None:
    _check_order_state(order)
    row = next((d for d in order.discounts if d.id == order_discount_id), None)
    if row is None:
        raise NotFoundError("order_discount_not_found")
    if actor.role != Role.ADMIN and row.applied_by_user_id != actor.id:
        raise ForbiddenError("remove_other_user_discount_admin_only")
    assert order.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="discount.remove.order",
        entity_type="order",
        entity_id=order.id,
        payload={
            "order_discount_id": row.id,
            "discount_id": row.discount_id,
            "name": row.name,
            "amount_off": row.amount_off,
        },
    )
    session.delete(row)
    # Keep the in-memory relationship in sync so the downstream recompute
    # iterates the post-delete state.
    order.discounts.remove(row)
    session.flush()


def remove_from_item(
    session: Session,
    order: Order,
    item: OrderItem,
    order_item_discount_id: int,
    *,
    actor: User,
) -> None:
    _check_order_state(order)
    row = next(
        (d for d in item.discounts if d.id == order_item_discount_id),
        None,
    )
    if row is None:
        raise NotFoundError("order_item_discount_not_found")
    if actor.role != Role.ADMIN and row.applied_by_user_id != actor.id:
        raise ForbiddenError("remove_other_user_discount_admin_only")
    assert item.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="discount.remove.item",
        entity_type="order_item",
        entity_id=item.id,
        payload={
            "order_item_discount_id": row.id,
            "discount_id": row.discount_id,
            "name": row.name,
            "amount_off": row.amount_off,
        },
    )
    session.delete(row)
    item.discounts.remove(row)
    session.flush()
