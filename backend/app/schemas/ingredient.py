"""Ingredient schemas."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.ingredient import Unit


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    unit: Unit = Unit.GRAM
    shelf_life_days: int | None = Field(default=None, ge=0)


class IngredientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    unit: Unit | None = None
    shelf_life_days: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class IngredientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    unit: Unit
    shelf_life_days: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class IngredientWithStockRead(IngredientRead):
    """Ingredient + its current stock_level (single row, may be None)."""

    quantity: Decimal | None = None
    reorder_point: Decimal | None = None
