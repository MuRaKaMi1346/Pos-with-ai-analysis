"""Payment / pay-bill service (M5).

Multi-tender flow: clerk submits N ``TenderItem`` rows. Each contributes
to ``order.total`` via its ``amount``. Cash tenders may set
``tendered_amount`` to track the bill the customer handed over — the
excess is the bill-level ``change_due``.

Rules:
- Bill must be ``OPEN``. ``HOLD`` requires explicit resume first.
  ``PAID`` / ``REFUNDED`` / ``VOIDED`` → 409.
- Stock + send-to-kitchen are independent of payment; a bill can be
  paid before send-to-kitchen (counter pickup) or after.
- ``sum(tender.amount)`` must equal ``order.total`` exactly. Cash
  tenders may overpay via ``tendered_amount``; that excess populates
  ``change_due``. Non-cash overpayment is rejected (customer card
  can't be over-charged).
- ``reference`` is required for CARD + QR_PROMPTPAY (last-4 / slip ref).
- M5 ignores `cashier_shift_id` — wires up in M8.
"""

from decimal import Decimal

from sqlmodel import Session

from app.core.config import Settings
from app.core.exceptions import ConflictError, ValidationError
from app.models import (
    Order,
    OrderStatus,
    Payment,
    PaymentMethod,
)
from app.schemas.payment import TenderItem
from app.services import customer_service, shift_service
from app.utils.datetime import now_utc

_TWO_DP = Decimal("0.01")

_NON_CASH_REQUIRES_REFERENCE = {PaymentMethod.CARD, PaymentMethod.QR_PROMPTPAY}


def pay_order(
    session: Session,
    order: Order,
    tenders: list[TenderItem],
    *,
    settings: Settings,
    user_id: int,
) -> Order:
    """Flip ``order`` to PAID with the supplied tender mix. Atomic.

    M7: on success, awards loyalty points to the attached customer (if any)
    within the same transaction.
    """
    if order.status != OrderStatus.OPEN:
        raise ConflictError(f"cannot_pay_status:{order.status}")
    if order.voided_at is not None:
        raise ConflictError("cannot_pay_voided")

    # ── 1. Validate per-tender invariants ──────────────────────────
    cash_amount = Decimal("0.00")
    cash_tendered = Decimal("0.00")
    non_cash_amount = Decimal("0.00")
    for idx, t in enumerate(tenders):
        if t.method in _NON_CASH_REQUIRES_REFERENCE and not t.reference:
            raise ValidationError(f"reference_required:tender_{idx}_{t.method}")
        if t.method == PaymentMethod.CASH:
            cash_amount += t.amount
            cash_tendered += t.tendered_amount if t.tendered_amount is not None else t.amount
        else:
            non_cash_amount += t.amount

    # ── 2. Validate totals ──────────────────────────────────────────
    sum_amount = (cash_amount + non_cash_amount).quantize(_TWO_DP)
    if sum_amount != order.total:
        raise ValidationError(
            f"amount_sum_must_equal_total:expected_{order.total}_got_{sum_amount}"
        )
    if non_cash_amount > order.total:
        raise ValidationError("non_cash_overpayment_not_allowed")

    change_due = (cash_tendered - cash_amount).quantize(_TWO_DP)
    if change_due < Decimal("0"):
        change_due = Decimal("0.00")

    # ── 3. Persist Payment rows ─────────────────────────────────────
    assert order.id is not None
    now = now_utc()
    for t in tenders:
        session.add(
            Payment(
                order_id=order.id,
                method=t.method,
                amount=t.amount,
                reference=t.reference,
                tendered_amount=(t.tendered_amount if t.method == PaymentMethod.CASH else None),
                paid_at=now,
            )
        )

    # ── 4. Flip Order to PAID ───────────────────────────────────────
    order.status = OrderStatus.PAID
    order.closed_at = now
    order.paid_total = sum_amount
    order.change_due = change_due
    order.updated_at = now
    session.add(order)

    # ── 5. Stamp the paying cashier's open shift (if any) — M8 ───────
    shift = shift_service.get_open_for_user(session, user_id)
    if shift is not None:
        order.cashier_shift_id = shift.id
        session.add(order)

    # ── 6. Award loyalty points (no-op for walk-ins) ────────────────
    customer_service.earn_for_order(session, order, settings=settings)

    session.commit()
    session.refresh(order)
    return order
