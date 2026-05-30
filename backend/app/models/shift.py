"""Cashier shift + cash drawer movements (M8).

A ``CashierShift`` is a cashier's till session: it opens with a counted
``opening_float`` and closes with a counted ``closing_cash_counted``. At
close, ``expected_cash`` is derived from the float plus cash sales minus
cash refunds plus net drawer movements attributed to the shift, and
``cash_variance = closing_cash_counted - expected_cash`` is stored.

A shift is *open* exactly while ``closed_at IS NULL``; a user may hold at
most one open shift at a time (enforced in ``shift_service``).

``CashMovement`` rows are mid-shift drawer pay-ins / pay-outs (petty cash,
supplier paid from the till, …), tied to the open shift.

Orders (at pay time) and refunds (at refund time) stamp their own
``cashier_shift_id`` so the close-out reconciliation can find their cash —
a refund in a later shift is attributed to *that* shift, not the sale's.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc


class CashMovementType(StrEnum):
    PAY_IN = "pay_in"  # cash added to the drawer (e.g. float top-up)
    PAY_OUT = "pay_out"  # cash removed (e.g. supplier paid from the till)


class CashierShift(SQLModel, table=True):
    __tablename__ = "cashier_shifts"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    opening_float: Decimal = Field(max_digits=12, decimal_places=2)

    # ── Set at close ────────────────────────────────────────────────
    closing_cash_counted: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    expected_cash: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    cash_variance: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    closing_note: str | None = Field(default=None, max_length=255)

    opened_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
    # NULL ⇔ the shift is still open.
    closed_at: datetime | None = Field(default=None, index=True)

    movements: list["CashMovement"] = Relationship(back_populates="shift")

    @property
    def is_open(self) -> bool:
        return self.closed_at is None


class CashMovement(SQLModel, table=True):
    __tablename__ = "cash_movements"

    id: int | None = Field(default=None, primary_key=True)
    cashier_shift_id: int = Field(foreign_key="cashier_shifts.id", index=True)
    type: CashMovementType = Field(index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)  # positive magnitude
    reason: str | None = Field(default=None, max_length=255)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)

    shift: CashierShift = Relationship(back_populates="movements")
