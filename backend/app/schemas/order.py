"""Order schemas — including nested item + modifier reads."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    qty: int = Field(default=1, ge=1, le=999)
    modifier_ids: list[int] = Field(default_factory=list)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)
    note: str | None = Field(default=None, max_length=255)


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
    modifiers: list[OrderItemModifierRead] = Field(default_factory=list)


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total: Decimal
    status: OrderStatus
    user_id: int | None
    note: str | None
    items: list[OrderItemRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
