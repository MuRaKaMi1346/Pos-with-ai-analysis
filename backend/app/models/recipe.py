"""Recipe / BOM line: how much of an ingredient a product consumes.

The hot path (``order_service``) walks these to deduct stock when a sale closes.
A unique constraint on (product_id, ingredient_id) prevents duplicate BOM rows
for the same pair.
"""

from decimal import Decimal
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.ingredient import Unit

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient
    from app.models.product import Product


class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"
    __table_args__: ClassVar = (
        UniqueConstraint("product_id", "ingredient_id", name="uq_recipe_product_ingredient"),
    )

    id: int | None = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", index=True)
    qty: Decimal = Field(max_digits=12, decimal_places=4)
    unit: Unit = Field(default=Unit.GRAM)

    product: "Product" = Relationship(back_populates="recipes")
    ingredient: "Ingredient" = Relationship(back_populates="recipes")
