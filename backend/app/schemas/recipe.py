"""Recipe / BOM line schemas."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.ingredient import Unit


class RecipeCreate(BaseModel):
    product_id: int
    ingredient_id: int
    qty: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=4)
    unit: Unit = Unit.GRAM


class RecipeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    ingredient_id: int
    qty: Decimal
    unit: Unit
