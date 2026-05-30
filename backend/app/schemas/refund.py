"""Refund + RefundItem schemas (M6)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RefundItemBody(BaseModel):
    """One row of a ``POST /refunds/`` body."""

    order_item_id: int
    qty: int = Field(ge=1)
    restock: bool = True


class RefundCreate(BaseModel):
    order_id: int
    items: list[RefundItemBody] = Field(min_length=1)
    reason: str | None = Field(default=None, max_length=255)


class RefundItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_item_id: int
    qty: int
    amount: Decimal
    restock: bool


class RefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    refund_number: str
    amount: Decimal
    reason: str | None
    refunded_by_user_id: int
    cashier_shift_id: int | None
    items: list[RefundItemRead] = Field(default_factory=list)
    created_at: datetime
