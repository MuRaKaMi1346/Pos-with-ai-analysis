"""Category, Product, Modifier, ModifierGroup + Product↔Modifier link.

- Category is self-referential (sub-categories supported).
- ``ModifierGroup`` (M2) carries POS UX semantics — min/max selectable and
  whether the group is required. Each ``Modifier`` belongs to exactly one
  group; products link to individual modifiers (not whole groups) so an
  espresso can offer a subset of the shared "Sweetness" choices.
- Modifier ↔ Product stays many-to-many: the actual choice picked per sale
  lives in ``OrderItemModifier``.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.models.kds import Station
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
    # M9: which KDS station this category's items are routed to at send-to-kitchen.
    default_station: Station = Field(default=Station.BAR)

    products: list["Product"] = Relationship(back_populates="category")


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=120)
    category_id: int | None = Field(default=None, foreign_key="categories.id", index=True)
    price: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    cost: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    image: str | None = Field(default=None, max_length=512)
    # M15: scan-to-add codes — unique when set (SQLite allows multiple NULLs).
    sku: str | None = Field(default=None, max_length=64, index=True, unique=True)
    barcode: str | None = Field(default=None, max_length=64, index=True, unique=True)
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

    @property
    def has_modifiers(self) -> bool:
        """Any active modifier linked to this product — lets the POS card show a
        customise dot and decide whether tapping opens the modifier picker (M13)."""
        return any(m.is_active for m in self.modifiers)


class ModifierGroup(SQLModel, table=True):
    """A logical set of modifiers (e.g. "Sweetness", "Milk", "Size").

    - ``min_select`` / ``max_select`` drive the POS picker UX.
      ``max_select=1`` renders as radio; ``>1`` as multi-checkbox.
    - ``is_required`` forces a selection before the line can be added
      to the cart.
    - ``sort_order`` keeps groups in a deterministic order on screen.
    """

    __tablename__ = "modifier_groups"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=100)
    min_select: int = Field(default=0, ge=0)
    max_select: int = Field(default=1, ge=1)
    is_required: bool = Field(default=False)
    sort_order: int = Field(default=0)

    modifiers: list["Modifier"] = Relationship(back_populates="group")


class Modifier(SQLModel, table=True):
    """Customer-selectable add-on / option (one of a ``ModifierGroup``)."""

    __tablename__ = "modifiers"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=100)
    price_delta: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    group_id: int = Field(foreign_key="modifier_groups.id", index=True)
    is_active: bool = Field(default=True, index=True)
    sort_order: int = Field(default=0)

    group: ModifierGroup = Relationship(back_populates="modifiers")
    products: list[Product] = Relationship(
        back_populates="modifiers",
        link_model=ProductModifierLink,
    )
    recipes: list["Recipe"] = Relationship(back_populates="modifier")
