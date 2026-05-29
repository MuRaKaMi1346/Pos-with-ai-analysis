"""Recipe / BOM line: how much of an ingredient is consumed.

A recipe belongs to *either* a ``Product`` (the base drink) *or* a
``Modifier`` (e.g. "Extra shot" → 7 g coffee beans). The XOR is enforced
both by a SQLite CHECK constraint and by ``recipe_service.create``.

A pair of partial unique constraints prevents duplicate BOM rows for the
same (product, ingredient) or (modifier, ingredient).
"""

from decimal import Decimal
from typing import TYPE_CHECKING, ClassVar, Optional

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.ingredient import Unit

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient
    from app.models.product import Modifier, Product


class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"
    __table_args__: ClassVar = (
        UniqueConstraint("product_id", "ingredient_id", name="uq_recipe_product_ingredient"),
        UniqueConstraint("modifier_id", "ingredient_id", name="uq_recipe_modifier_ingredient"),
        CheckConstraint(
            "(product_id IS NOT NULL) <> (modifier_id IS NOT NULL)",
            name="ck_recipe_owner_xor",
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    product_id: int | None = Field(default=None, foreign_key="products.id", index=True)
    modifier_id: int | None = Field(default=None, foreign_key="modifiers.id", index=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", index=True)
    qty: Decimal = Field(max_digits=12, decimal_places=4)
    unit: Unit = Field(default=Unit.GRAM)

    product: Optional["Product"] = Relationship(back_populates="recipes")
    modifier: Optional["Modifier"] = Relationship(back_populates="recipes")
    ingredient: "Ingredient" = Relationship(back_populates="recipes")
