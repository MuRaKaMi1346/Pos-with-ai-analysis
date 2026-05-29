"""Modifier + ModifierGroup schemas (M2).

ModifierGroup carries the POS picker UX (radio vs checkbox, required flag).
Modifier itself is currently created/edited through the group endpoints —
no top-level CRUD this milestone.
"""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ModifierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price_delta: Decimal
    sort_order: int
    is_active: bool


class ModifierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price_delta: Decimal = Field(
        default=Decimal("0.00"), ge=Decimal("0"), max_digits=10, decimal_places=2
    )
    sort_order: int = 0
    is_active: bool = True


class ModifierGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    min_select: int = Field(default=0, ge=0)
    max_select: int = Field(default=1, ge=1)
    is_required: bool = False
    sort_order: int = 0
    modifiers: list[ModifierCreate] = Field(default_factory=list)


class ModifierGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    min_select: int | None = Field(default=None, ge=0)
    max_select: int | None = Field(default=None, ge=1)
    is_required: bool | None = None
    sort_order: int | None = None


class ModifierGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    min_select: int
    max_select: int
    is_required: bool
    sort_order: int
    modifiers: list[ModifierRead] = Field(default_factory=list)
