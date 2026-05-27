"""Inventory schemas (stock levels + movements + receive request)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.inventory import MovementType


class StockLevelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_id: int
    quantity: Decimal
    reorder_point: Decimal | None
    updated_at: datetime


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_id: int
    type: MovementType
    qty: Decimal
    ref: str | None
    note: str | None
    user_id: int | None
    created_at: datetime


class ReceiveStockRequest(BaseModel):
    """Add stock — positive qty only."""

    ingredient_id: int
    qty: Decimal = Field(gt=Decimal("0"), max_digits=14, decimal_places=4)
    ref: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=255)
