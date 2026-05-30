"""Cashier shift + cash drawer service (M8).

Open/close a till session and reconcile its cash. A user may hold at most
one open shift. Closing computes::

    expected_cash = opening_float
                  + Σ(cash sale payments attributed to the shift)
                  + Σ(cash refund payments attributed to the shift)   # negative
                  + Σ(drawer pay-ins) - Σ(drawer pay-outs)

and stores ``cash_variance = closing_cash_counted - expected_cash``.

This service is a *leaf* — it never imports order/payment/refund services,
so order_service (create gate), payment_service (pay-time stamp) and
refund_service (refund-time stamp) can all call into it without cycles.
"""

from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import CashierShift, CashMovement, CashMovementType, User
from app.repositories import shift_repo
from app.services import audit_service
from app.utils.datetime import now_utc

_TWO_DP = Decimal("0.01")


# ── Read ────────────────────────────────────────────────────────────


def get_or_404(session: Session, shift_id: int) -> CashierShift:
    shift = shift_repo.repository.get(session, shift_id)
    if shift is None:
        raise NotFoundError("shift_not_found")
    return shift


def get_open_for_user(session: Session, user_id: int) -> CashierShift | None:
    return shift_repo.get_open_for_user(session, user_id)


def list_shifts(
    session: Session,
    *,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[CashierShift]:
    return shift_repo.list_filtered(
        session,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )


def list_movements(session: Session, shift_id: int) -> Sequence[CashMovement]:
    return shift_repo.movements_for_shift(session, shift_id)


# ── Open / close ────────────────────────────────────────────────────


def open_shift(session: Session, *, actor: User, opening_float: Decimal) -> CashierShift:
    """Open a till session. Rejects a second concurrent open for the user."""
    assert actor.id is not None
    if shift_repo.get_open_for_user(session, actor.id) is not None:
        raise ConflictError("shift_already_open")
    shift = CashierShift(user_id=actor.id, opening_float=opening_float, opened_at=now_utc())
    session.add(shift)
    session.flush()
    assert shift.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="shift.open",
        entity_type="cashier_shift",
        entity_id=shift.id,
        payload={"opening_float": opening_float},
    )
    session.commit()
    session.refresh(shift)
    return shift


def _expected_cash(session: Session, shift: CashierShift) -> Decimal:
    assert shift.id is not None
    cash_sales = sum(
        (p.amount for p in shift_repo.cash_sale_payments(session, shift.id)),
        Decimal("0.00"),
    )
    cash_refunds = sum(  # already negative (refund payments carry a negative amount)
        (p.amount for p in shift_repo.cash_refund_payments(session, shift.id)),
        Decimal("0.00"),
    )
    movement_net = Decimal("0.00")
    for m in shift_repo.movements_for_shift(session, shift.id):
        movement_net += m.amount if m.type == CashMovementType.PAY_IN else -m.amount
    return (shift.opening_float + cash_sales + cash_refunds + movement_net).quantize(_TWO_DP)


def close_shift(
    session: Session,
    *,
    actor: User,
    closing_cash_counted: Decimal,
    closing_note: str | None,
) -> CashierShift:
    """Close the caller's open shift and store the reconciliation result."""
    assert actor.id is not None
    shift = shift_repo.get_open_for_user(session, actor.id)
    if shift is None:
        raise ConflictError("no_open_shift")

    expected = _expected_cash(session, shift)
    variance = (closing_cash_counted - expected).quantize(_TWO_DP)
    now = now_utc()
    shift.closing_cash_counted = closing_cash_counted
    shift.expected_cash = expected
    shift.cash_variance = variance
    shift.closing_note = closing_note
    shift.closed_at = now
    session.add(shift)
    assert shift.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="shift.close",
        entity_type="cashier_shift",
        entity_id=shift.id,
        payload={
            "opening_float": shift.opening_float,
            "expected_cash": expected,
            "closing_cash_counted": closing_cash_counted,
            "cash_variance": variance,
        },
    )
    session.commit()
    session.refresh(shift)
    return shift


# ── Cash drawer ─────────────────────────────────────────────────────


def record_cash_movement(
    session: Session,
    *,
    actor: User,
    movement_type: CashMovementType,
    amount: Decimal,
    reason: str | None,
) -> CashMovement:
    """Record a pay-in / pay-out against the caller's open shift."""
    assert actor.id is not None
    shift = shift_repo.get_open_for_user(session, actor.id)
    if shift is None:
        raise ConflictError("no_open_shift")
    assert shift.id is not None
    movement = CashMovement(
        cashier_shift_id=shift.id,
        type=movement_type,
        amount=amount,
        reason=reason,
        user_id=actor.id,
    )
    session.add(movement)
    session.flush()
    assert movement.id is not None
    audit_service.record(
        session,
        actor=actor,
        action="cash_drawer.movement",
        entity_type="cash_movement",
        entity_id=movement.id,
        payload={
            "shift_id": shift.id,
            "type": str(movement_type),
            "amount": amount,
            "reason": reason,
        },
    )
    session.commit()
    session.refresh(movement)
    return movement
