"""Category, Product, Modifier + Product↔Modifier link.

- Category is self-referential (sub-categories supported).
- Modifier ↔ Product is many-to-many: e.g. "Sweetness" modifiers apply to all
  coffees. The actual choice picked per sale lives in ``OrderItemModifier``.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import OrderItem
    from app.models.recipe import Recipe


class ProductModifierLink(SQLModel, table=True):
    """Association table: which modifiers are available for which products."""

    __tablename__ = "product_modifier_links"

    product_id: int = Field(foreign_key="products.id", primary_key=True)
    modifier_id: int = Field(foreign_key="modifiers.id", primary_key=True)


class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=100)
    parent_id: int | None = Field(default=None, foreign_key="categories.id")

    products: list["Product"] = Relationship(back_populates="category")


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    category_id: int | None = Field(default=None, foreign_key="categories.id", index=True)
    price: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    cost: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    image: str | None = Field(default=None, max_length=512)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    category: Category | None = Relationship(back_populates="products")
    modifiers: list["Modifier"] = Relationship(
        back_populates="products",
        link_model=ProductModifierLink,
    )
    recipes: list["Recipe"] = Relationship(back_populates="product")
    order_items: list["OrderItem"] = Relationship(back_populates="product")


class Modifier(SQLModel, table=True):
    """Customer-selectable add-on / option. Grouped by ``group`` (e.g. "sweetness")."""

    __tablename__ = "modifiers"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=100)
    price_delta: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    group: str = Field(max_length=50, index=True)
    is_active: bool = Field(default=True, index=True)

    products: list[Product] = Relationship(
        back_populates="modifiers",
        link_model=ProductModifierLink,
    )
