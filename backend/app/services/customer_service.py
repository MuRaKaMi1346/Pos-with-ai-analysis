"""Customer + loyalty service (M7).

CRUD for customer profiles plus the loyalty engine:

- **Earn** — on every bill that flips to PAID, ``earn_for_order`` awards
  ``floor(order.total / pos_loyalty_baht_per_earn_point)`` points and rolls
  the lifetime aggregates (spend / visits / last_visit_at). Called from
  ``payment_service.pay_order`` inside the pay transaction.
- **Redeem** — ``redeem_points`` debits the point balance immediately and
  parks the baht value in ``pending_redemption_baht``. The next order
  created for that customer (``order_service.create_order``) snapshots it as
  a ``POINTS`` order-discount and zeroes the pending field.

``code`` is generated post-insert as ``C{id:05d}``.
"""

from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core.config import Settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models import Customer, Order, User
from app.repositories import customer_repo, order_repo
from app.schemas.customer import CustomerCreate, CustomerUpdate, LoyaltyRedeemResult
from app.services import audit_service
from app.utils.datetime import now_utc

_TWO_DP = Decimal("0.01")


# ── Read ────────────────────────────────────────────────────────────


def get_or_404(session: Session, customer_id: int) -> Customer:
    customer = customer_repo.repository.get(session, customer_id)
    if customer is None:
        raise NotFoundError("customer_not_found")
    return customer


def search(
    session: Session,
    *,
    q: str | None = None,
    include_inactive: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> Sequence[Customer]:
    return customer_repo.search(
        session, q=q, include_inactive=include_inactive, offset=offset, limit=limit
    )


def list_orders(
    session: Session, customer_id: int, *, offset: int = 0, limit: int = 100
) -> Sequence[Order]:
    return order_repo.list_by_customer(session, customer_id, offset=offset, limit=limit)


# ── Write ───────────────────────────────────────────────────────────


def create(session: Session, data: CustomerCreate) -> Customer:
    """Insert a profile; ``code`` is assigned ``C{id:05d}`` post-flush."""
    if data.phone is not None and customer_repo.get_by_phone(session, data.phone) is not None:
        raise ConflictError("customer_phone_exists")
    # A transient unique placeholder satisfies the unique ``code`` index
    # before the id exists; rewritten to C{id:05d} right after flush.
    customer = Customer(
        code=uuid4().hex[:20],
        name=data.name,
        phone=data.phone,
        email=data.email,
        note=data.note,
    )
    session.add(customer)
    try:
        session.flush()
    except IntegrityError as exc:
        # Race: a concurrent insert grabbed the same phone between the
        # pre-check and flush. Surface the same conflict.
        session.rollback()
        raise ConflictError("customer_phone_exists") from exc
    assert customer.id is not None
    customer.code = f"C{customer.id:05d}"
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


def update(session: Session, customer_id: int, data: CustomerUpdate) -> Customer:
    customer = get_or_404(session, customer_id)
    fields = data.model_dump(exclude_unset=True)
    new_phone = fields.get("phone")
    if "phone" in fields and new_phone is not None and new_phone != customer.phone:
        clash = customer_repo.get_by_phone(session, new_phone)
        if clash is not None and clash.id != customer.id:
            raise ConflictError("customer_phone_exists")
    for key, value in fields.items():
        setattr(customer, key, value)
    customer.updated_at = now_utc()
    return customer_repo.repository.save(session, customer)


def soft_delete(session: Session, customer_id: int) -> Customer:
    """Flip ``is_active=false`` — historical orders keep the FK valid."""
    customer = get_or_404(session, customer_id)
    customer.is_active = False
    customer.updated_at = now_utc()
    return customer_repo.repository.save(session, customer)


# ── Loyalty ─────────────────────────────────────────────────────────


def redeem_points(
    session: Session,
    customer: Customer,
    points: int,
    *,
    actor: User,
    settings: Settings,
) -> LoyaltyRedeemResult:
    """Debit ``points`` now; park the baht value for the customer's next bill."""
    if not customer.is_active:
        raise ConflictError("customer_inactive")
    if points > customer.loyalty_points:
        raise ValidationError(f"insufficient_points:have_{customer.loyalty_points}_need_{points}")
    discount_amount = (Decimal(points) * settings.pos_loyalty_baht_per_redeem_point).quantize(
        _TWO_DP, rounding=ROUND_HALF_UP
    )
    if discount_amount <= 0:
        raise ValidationError("redemption_amount_zero")

    customer.loyalty_points -= points
    customer.pending_redemption_baht += discount_amount
    customer.updated_at = now_utc()
    session.add(customer)
    assert customer.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="loyalty.redeem",
        entity_type="customer",
        entity_id=customer.id,
        payload={
            "points": points,
            "discount_amount": discount_amount,
            "points_remaining": customer.loyalty_points,
        },
    )
    session.commit()
    session.refresh(customer)
    return LoyaltyRedeemResult(
        points_redeemed=points,
        discount_amount=discount_amount,
        points_remaining=customer.loyalty_points,
        pending_redemption_baht=customer.pending_redemption_baht,
    )


def earn_for_order(session: Session, order: Order, *, settings: Settings) -> None:
    """Award loyalty points + roll lifetime aggregates for a just-paid bill.

    No-op for walk-ins (``customer_id is None``). The caller
    (``payment_service.pay_order``) owns the commit — we only stage the
    mutation onto the session.
    """
    if order.customer_id is None:
        return
    customer = session.get(Customer, order.customer_id)
    if customer is None:
        return
    per_point = settings.pos_loyalty_baht_per_earn_point
    earned = int(order.total // per_point) if per_point > 0 else 0
    customer.loyalty_points += earned
    customer.total_spend += order.total
    customer.total_visits += 1
    now = now_utc()
    customer.last_visit_at = now
    customer.updated_at = now
    session.add(customer)
