"""Order, OrderItem, OrderItemModifier + OrderStatus enum.

Order is the bill. OrderItem is a single product line. OrderItemModifier is the
concrete modifier the customer chose (with frozen price_delta from sale time).
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.payment import Payment
    from app.models.product import Modifier, Product


class OrderStatus(StrEnum):
    OPEN = "open"  # cart / in progress
    PAID = "paid"
    VOIDED = "voided"
    REFUNDED = "refunded"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: int | None = Field(default=None, primary_key=True)
    total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    status: OrderStatus = Field(default=OrderStatus.OPEN, index=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    note: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    items: list["OrderItem"] = Relationship(back_populates="order")
    payments: list["Payment"] = Relationship(back_populates="order")


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    qty: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    """Snapshot of product.price at sale time — never recompute from product."""

    order: Order = Relationship(back_populates="items")
    product: "Product" = Relationship(back_populates="order_items")
    modifiers: list["OrderItemModifier"] = Relationship(back_populates="order_item")


class OrderItemModifier(SQLModel, table=True):
    __tablename__ = "order_item_modifiers"

    id: int | None = Field(default=None, primary_key=True)
    order_item_id: int = Field(foreign_key="order_items.id", index=True)
    modifier_id: int = Field(foreign_key="modifiers.id")
    price_delta: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    """Snapshot of modifier.price_delta at sale time."""

    order_item: OrderItem = Relationship(back_populates="modifiers")
    modifier: "Modifier" = Relationship()
