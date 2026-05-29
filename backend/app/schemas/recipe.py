"""Recipe (BOM) line schemas.

M2: a recipe belongs to either a product OR a modifier. The XOR is enforced
by ``recipe_service.create`` (and a CHECK constraint at the SQL level).
"""

from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.ingredient import Unit


class RecipeCreate(BaseModel):
    product_id: int | None = None
    modifier_id: int | None = None
    ingredient_id: int
    qty: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=4)
    unit: Unit = Unit.GRAM

    @model_validator(mode="after")
    def _xor_owner(self) -> Self:
        if (self.product_id is None) == (self.modifier_id is None):
            raise ValueError("exactly_one_of_product_id_or_modifier_id")
        return self


class RecipeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int | None
    modifier_id: int | None
    ingredient_id: int
    qty: Decimal
    unit: Unit
