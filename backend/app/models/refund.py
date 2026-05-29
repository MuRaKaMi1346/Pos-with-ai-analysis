"""Refund + RefundItem (M6).

A bill can be refunded line-by-line. Each ``Refund`` row aggregates one
or more ``RefundItem`` rows pointing at the original ``OrderItem``s with
the refunded ``qty``, ``amount`` (the cash-back for that line), and a
``restock`` flag that controls whether stock is returned to inventory.

The parent ``Order.status`` flips to ``PARTIALLY_REFUNDED`` (if total
refunded < order.total) or ``REFUNDED`` (if fully refunded).

A negative-amount ``Payment`` row tagged ``is_refund=true`` is written
alongside so accounting reconciles.

``cashier_shift_id`` is deferred to M8 (cashier shifts table).
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import Order, OrderItem


class Refund(SQLModel, table=True):
    __tablename__ = "refunds"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    # Human-friendly per-day rolling number like ``R20260529-0001``.
    refund_number: str = Field(max_length=20, index=True, unique=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)  # total refunded
    reason: str | None = Field(default=None, max_length=255)
    refunded_by_user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)

    order: "Order" = Relationship(back_populates="refunds")
    items: list["RefundItem"] = Relationship(back_populates="refund")


class RefundItem(SQLModel, table=True):
    __tablename__ = "refund_items"

    id: int | None = Field(default=None, primary_key=True)
    refund_id: int = Field(foreign_key="refunds.id", index=True)
    order_item_id: int = Field(foreign_key="order_items.id", index=True)
    qty: int = Field(ge=1)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    restock: bool = Field(default=True)

    refund: Refund = Relationship(back_populates="items")
    order_item: "OrderItem" = Relationship(back_populates="refund_items")
