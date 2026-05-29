"""Order, OrderItem, OrderItemModifier + OrderStatus / OrderChannel enums.

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
    from app.models.discount import OrderDiscount, OrderItemDiscount
    from app.models.payment import Payment
    from app.models.product import Modifier, Product
    from app.models.refund import Refund, RefundItem


class OrderStatus(StrEnum):
    OPEN = "open"  # cart / in progress (also: sent-to-kitchen but unpaid)
    HOLD = "hold"  # parked / saved-for-later (M3) — no stock held
    PAID = "paid"
    VOIDED = "voided"
    PARTIALLY_REFUNDED = "partially_refunded"  # M6 — some lines refunded
    REFUNDED = "refunded"  # M6 — bill fully refunded


class OrderChannel(StrEnum):
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"


class KitchenStatus(StrEnum):
    """Per-line kitchen progress (M3 sets PENDING/PREPARING/CANCELLED; the KDS
    view in M9 will surface READY/SERVED transitions)."""

    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: int | None = Field(default=None, primary_key=True)
    # Human-friendly daily-rolling number like 20260528-0042. Generated in
    # order_service. Unique index across the whole table.
    order_number: str = Field(max_length=20, index=True, unique=True)
    channel: OrderChannel = Field(default=OrderChannel.TAKEAWAY, index=True)
    table_number: str | None = Field(default=None, max_length=16)

    status: OrderStatus = Field(default=OrderStatus.OPEN, index=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    note: str | None = Field(default=None, max_length=255)

    # ── Totals breakdown (snapshot at sale time) ────────────────────
    # subtotal = sum(line.qty * line.unit_price) BEFORE discounts. If
    # tax_inclusive=true, line prices already include VAT (Thai default).
    subtotal: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    discount_total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    service_charge: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    service_charge_rate: Decimal = Field(default=Decimal("0.0000"), max_digits=5, decimal_places=4)
    tax_total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    tax_rate: Decimal = Field(default=Decimal("0.0000"), max_digits=5, decimal_places=4)
    tax_inclusive: bool = Field(default=True)
    tip_total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    rounding_adjustment: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    # Grand total — what the customer owes. Subsequent payment milestones
    # will keep `paid_total` and `change_due` in sync with the Payments rows.
    total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    paid_total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    change_due: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)

    # ── Lifecycle timestamps (M3) ────────────────────────────────────
    # NULL until the cashier hits "Send to kitchen" — stock is deducted at
    # that moment, not at create-time. Subsequent edits to lines are
    # blocked once this is set; per-line void with a reason is still
    # allowed (admin-only).
    sent_to_kitchen_at: datetime | None = Field(default=None)
    # M5: when the bill flips to PAID. Stays null for HOLD / OPEN / VOIDED.
    closed_at: datetime | None = Field(default=None)
    voided_at: datetime | None = Field(default=None)
    voided_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    void_reason: str | None = Field(default=None, max_length=255)

    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    items: list["OrderItem"] = Relationship(back_populates="order")
    payments: list["Payment"] = Relationship(back_populates="order")
    discounts: list["OrderDiscount"] = Relationship(back_populates="order")
    refunds: list["Refund"] = Relationship(back_populates="order")


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    qty: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    """Snapshot of product.price at sale time — never recompute from product."""

    # ── Kitchen lifecycle + void (M3) ────────────────────────────────
    # Voided lines stay on the bill for audit but stop contributing to
    # totals. When voided after send-to-kitchen, stock is reversed.
    kitchen_status: KitchenStatus = Field(default=KitchenStatus.PENDING, index=True)
    is_voided: bool = Field(default=False, index=True)
    voided_reason: str | None = Field(default=None, max_length=255)

    order: Order = Relationship(back_populates="items")
    product: "Product" = Relationship(back_populates="order_items")
    modifiers: list["OrderItemModifier"] = Relationship(back_populates="order_item")
    discounts: list["OrderItemDiscount"] = Relationship(back_populates="order_item")
    refund_items: list["RefundItem"] = Relationship(back_populates="order_item")


class OrderItemModifier(SQLModel, table=True):
    __tablename__ = "order_item_modifiers"

    id: int | None = Field(default=None, primary_key=True)
    order_item_id: int = Field(foreign_key="order_items.id", index=True)
    modifier_id: int = Field(foreign_key="modifiers.id")
    price_delta: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    """Snapshot of modifier.price_delta at sale time."""

    order_item: OrderItem = Relationship(back_populates="modifiers")
    modifier: "Modifier" = Relationship()
