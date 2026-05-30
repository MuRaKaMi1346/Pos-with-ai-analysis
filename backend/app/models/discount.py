"""Discount catalog + per-bill snapshots (M4).

- ``Discount`` is the admin-managed master row: a code, type, value, plus
  validity window and admin-threshold flag.
- ``OrderDiscount`` and ``OrderItemDiscount`` are **snapshots** on a
  specific bill / line. The snapshot fields (``name``, ``type``, ``value``,
  ``amount_off``) are written at apply-time so the bill stays correct
  if the master Discount is edited or deactivated later.
- ``amount_off`` is recomputed every time the bill's items change (via
  ``order_service``); ``value`` + ``type`` drive the formula.
- ``discount_id`` is nullable so cashiers can grant an **ad-hoc** discount
  (e.g. manager override) without first creating a master Discount row.
  In that case ``reason`` + ``applied_by_user_id`` are mandatory at the
  service layer.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import Order, OrderItem


class DiscountScope(StrEnum):
    ORDER = "order"
    ITEM = "item"


class DiscountType(StrEnum):
    PERCENT = "percent"  # value stored as 0.10 for 10%
    AMOUNT = "amount"  # value stored as raw THB
    POINTS = "points"  # M7 loyalty redemption — value is the baht amount


class Discount(SQLModel, table=True):
    """Admin-managed master row."""

    __tablename__ = "discounts"

    id: int | None = Field(default=None, primary_key=True)
    code: str | None = Field(default=None, max_length=50, index=True, unique=True)
    name: str = Field(max_length=120)
    scope: DiscountScope = Field(index=True)
    type: DiscountType
    value: Decimal = Field(max_digits=12, decimal_places=4)
    starts_at: datetime | None = Field(default=None)
    ends_at: datetime | None = Field(default=None)
    min_order_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    max_discount_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    requires_admin: bool = Field(default=False)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)


class OrderDiscount(SQLModel, table=True):
    """One row per discount applied to a whole bill."""

    __tablename__ = "order_discounts"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    discount_id: int | None = Field(default=None, foreign_key="discounts.id")
    name: str = Field(max_length=120)  # snapshot
    type: DiscountType  # snapshot
    value: Decimal = Field(max_digits=12, decimal_places=4)  # snapshot
    amount_off: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    applied_by_user_id: int = Field(foreign_key="users.id")
    reason: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)

    order: "Order" = Relationship(back_populates="discounts")


class OrderItemDiscount(SQLModel, table=True):
    """One row per discount applied to a single line."""

    __tablename__ = "order_item_discounts"

    id: int | None = Field(default=None, primary_key=True)
    order_item_id: int = Field(foreign_key="order_items.id", index=True)
    discount_id: int | None = Field(default=None, foreign_key="discounts.id")
    name: str = Field(max_length=120)
    type: DiscountType
    value: Decimal = Field(max_digits=12, decimal_places=4)
    amount_off: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    applied_by_user_id: int = Field(foreign_key="users.id")
    reason: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)

    order_item: "OrderItem" = Relationship(back_populates="discounts")
