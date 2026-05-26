"""Stock state + movement log + Waste detail.

- ``StockLevel`` is one row per ingredient — the current quantity on hand.
- ``StockMovement`` is the immutable history; every change in StockLevel must
  produce one row here (recieve / sale / waste / adjust).
- ``Waste`` extends a StockMovement of type=waste with reason + reporter info.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.ingredient import Ingredient


class MovementType(StrEnum):
    RECEIVE = "receive"
    SALE = "sale"
    WASTE = "waste"
    ADJUST = "adjust"


class StockLevel(SQLModel, table=True):
    __tablename__ = "stock_levels"

    id: int | None = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", unique=True, index=True)
    quantity: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=4)
    reorder_point: Decimal | None = Field(default=None, max_digits=14, decimal_places=4)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    ingredient: "Ingredient" = Relationship(back_populates="stock_level")


class StockMovement(SQLModel, table=True):
    __tablename__ = "stock_movements"

    id: int | None = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredients.id", index=True)
    type: MovementType = Field(index=True)
    qty: Decimal = Field(max_digits=14, decimal_places=4)
    """Signed quantity: positive for receive / adjust-up, negative for sale / waste."""

    ref: str | None = Field(default=None, max_length=120)
    """Origin reference, e.g. ``order:123`` or ``po:5``."""

    note: str | None = Field(default=None, max_length=255)
    user_id: int | None = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)

    ingredient: "Ingredient" = Relationship(back_populates="movements")


class Waste(SQLModel, table=True):
    """Reason + reporter for a stock_movement of type=waste."""

    __tablename__ = "wastes"

    id: int | None = Field(default=None, primary_key=True)
    stock_movement_id: int = Field(foreign_key="stock_movements.id", unique=True)
    reason: str = Field(max_length=255)
    reported_by: int | None = Field(default=None, foreign_key="users.id")
    reported_at: datetime = Field(default_factory=now_utc, nullable=False)
