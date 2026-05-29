"""Payment + PaymentMethod enum.

A bill has one Payment row per tender — multi-tender (e.g. half cash + half
card) splits into N rows that together cover ``order.total``. Refund rows
(M6) use ``is_refund=true`` and a negative ``amount``.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import Order


class PaymentMethod(StrEnum):
    CASH = "cash"
    QR_PROMPTPAY = "qr_promptpay"
    CARD = "card"
    OTHER = "other"


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    method: PaymentMethod = Field(default=PaymentMethod.CASH, index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    # M5: free-text reference — last-4 of card, QR slip number, custom note.
    reference: str | None = Field(default=None, max_length=100)
    # M5: for cash tenders, the amount the customer handed over. NULL for
    # non-cash. ``change_due`` (on Order) = sum(tendered_amount) - sum(amount)
    # across cash rows for that bill.
    tendered_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    # M6: refund rows carry the negative amount; M5 stays false everywhere.
    is_refund: bool = Field(default=False, index=True)
    # M5: voiding a tender (e.g. clerk fat-fingered) — kept for audit.
    voided: bool = Field(default=False, index=True)
    voided_at: datetime | None = Field(default=None)
    paid_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)

    order: "Order" = Relationship(back_populates="payments")
