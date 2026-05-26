"""Ingredient (raw material) + Unit enum.

Unit on the ingredient is the canonical storage unit. Recipe lines may use a
different unit (with conversion handled in the service layer).
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.inventory import StockLevel, StockMovement
    from app.models.recipe import Recipe


class Unit(StrEnum):
    GRAM = "g"
    KILOGRAM = "kg"
    MILLILITER = "ml"
    LITER = "l"
    PIECE = "piece"
    SHOT = "shot"
    PUMP = "pump"
    PACK = "pack"


class Ingredient(SQLModel, table=True):
    __tablename__ = "ingredients"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, max_length=120)
    unit: Unit = Field(default=Unit.GRAM)
    shelf_life_days: int | None = Field(default=None, ge=0)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    stock_level: "StockLevel | None" = Relationship(back_populates="ingredient")
    movements: list["StockMovement"] = Relationship(back_populates="ingredient")
    recipes: list["Recipe"] = Relationship(back_populates="ingredient")
