"""Payment + PaymentMethod enum.

An order can have multiple payment rows (split payment) — sum of amounts should
match order.total once the order moves to ``paid``.
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
    paid_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)

    order: "Order" = Relationship(back_populates="payments")
