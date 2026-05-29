"""Order schemas — including nested item + modifier reads.

M1 extension: channel + table_number on create; order_number + the full
totals breakdown on read. Discounts, customer_id, shifts, etc. arrive in
their own milestones (see docs/architecture-spec.md §7 + the pro-upgrade
prompt).
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import KitchenStatus, OrderChannel, OrderStatus
from app.schemas.discount import OrderDiscountRead, OrderItemDiscountRead


class OrderItemCreate(BaseModel):
    product_id: int
    qty: int = Field(default=1, ge=1, le=999)
    modifier_ids: list[int] = Field(default_factory=list)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)
    channel: OrderChannel = OrderChannel.TAKEAWAY
    table_number: str | None = Field(default=None, max_length=16)
    note: str | None = Field(default=None, max_length=255)
    # Optional tip the cashier collected — flows straight into tip_total.
    tip: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)


# ── Read (nested) ────────────────────────────────────────────────────


class OrderItemModifierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    modifier_id: int
    price_delta: Decimal


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    qty: int
    unit_price: Decimal
    kitchen_status: KitchenStatus
    is_voided: bool
    voided_reason: str | None
    modifiers: list[OrderItemModifierRead] = Field(default_factory=list)
    discounts: list[OrderItemDiscountRead] = Field(default_factory=list)


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_number: str
    channel: OrderChannel
    table_number: str | None
    status: OrderStatus
    user_id: int | None
    note: str | None
    items: list[OrderItemRead] = Field(default_factory=list)
    discounts: list[OrderDiscountRead] = Field(default_factory=list)

    # ── Totals breakdown ────────────────────────────────────────────
    subtotal: Decimal
    discount_total: Decimal
    service_charge: Decimal
    service_charge_rate: Decimal
    tax_total: Decimal
    tax_rate: Decimal
    tax_inclusive: bool
    tip_total: Decimal
    rounding_adjustment: Decimal
    total: Decimal
    paid_total: Decimal
    change_due: Decimal

    # ── Lifecycle (M3) ──────────────────────────────────────────────
    sent_to_kitchen_at: datetime | None
    voided_at: datetime | None
    voided_by_user_id: int | None
    void_reason: str | None

    created_at: datetime
    updated_at: datetime


# ── Lifecycle action bodies (M3) ─────────────────────────────────────


class OrderItemPatch(BaseModel):
    """One line of a ``PATCH /orders/{id}/items`` body — desired final state.

    The service diffs against the bill's current items: missing line ids are
    removed, new entries are added, and the qty / modifier set on a kept
    line is replaced in-place. Only valid before send-to-kitchen.
    """

    id: int | None = None
    product_id: int
    qty: int = Field(default=1, ge=1, le=999)
    modifier_ids: list[int] = Field(default_factory=list)


class OrderItemsReplace(BaseModel):
    items: list[OrderItemPatch] = Field(min_length=1)


class VoidReasonBody(BaseModel):
    reason: str = Field(min_length=1, max_length=255)
