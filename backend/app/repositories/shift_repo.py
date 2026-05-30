"""Cashier shift + cash movement repository (M8)."""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, desc, select

from app.models import (
    CashierShift,
    CashMovement,
    Order,
    Payment,
    PaymentMethod,
    Refund,
)
from app.repositories.base import BaseRepository

repository = BaseRepository(CashierShift)
movement_repository = BaseRepository(CashMovement)


def get_open_for_user(session: Session, user_id: int) -> CashierShift | None:
    """The user's currently-open shift (``closed_at IS NULL``), or None."""
    return session.exec(
        select(CashierShift).where(
            CashierShift.user_id == user_id,
            CashierShift.closed_at == None,  # noqa: E711 (SQLAlchemy IS NULL)
        )
    ).first()


def list_filtered(
    session: Session,
    *,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[CashierShift]:
    opened_col: ColumnElement[object] = CashierShift.opened_at  # type: ignore[assignment]
    statement = select(CashierShift).order_by(desc(opened_col))
    if user_id is not None:
        statement = statement.where(CashierShift.user_id == user_id)
    if date_from is not None:
        statement = statement.where(CashierShift.opened_at >= date_from)
    if date_to is not None:
        statement = statement.where(CashierShift.opened_at < date_to)
    return session.exec(statement.offset(offset).limit(limit)).all()


# ── Cash reconciliation sources (ORM comparisons → enum mapped safely) ──


def cash_sale_payments(session: Session, shift_id: int) -> Sequence[Payment]:
    """Non-refund CASH payments on orders rung up under this shift."""
    return session.exec(
        select(Payment)
        .join(Order)  # FK payments.order_id → orders.id
        .where(
            Order.cashier_shift_id == shift_id,
            Payment.method == PaymentMethod.CASH,
            Payment.is_refund == False,  # noqa: E712 (SQLAlchemy)
        )
    ).all()


def cash_refund_payments(session: Session, shift_id: int) -> Sequence[Payment]:
    """Negative CASH refund payments whose refund was processed under this shift.

    Joined Payment→Refund on ``reference == refund_number`` (refund_service
    stamps the refund_number into the negative payment's ``reference``).
    """
    # Not a FK pair, so the ON clause is explicit; cast for mypy (SQLModel
    # relaxes ``.where`` to accept bool but not ``.join``).
    onclause: ColumnElement[bool] = Payment.reference == Refund.refund_number  # type: ignore[assignment]
    return session.exec(
        select(Payment)
        .join(Refund, onclause)
        .where(
            Refund.cashier_shift_id == shift_id,
            Payment.method == PaymentMethod.CASH,
            Payment.is_refund == True,  # noqa: E712 (SQLAlchemy)
        )
    ).all()


def movements_for_shift(session: Session, shift_id: int) -> Sequence[CashMovement]:
    created_col: ColumnElement[object] = CashMovement.created_at  # type: ignore[assignment]
    return session.exec(
        select(CashMovement)
        .where(CashMovement.cashier_shift_id == shift_id)
        .order_by(desc(created_col))
    ).all()
