"""Product schemas (request/response)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.kds import Station


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category_id: int | None = None
    price: Decimal = Field(ge=Decimal("0"), max_digits=10, decimal_places=2)
    cost: Decimal = Field(
        default=Decimal("0.00"),
        ge=Decimal("0"),
        max_digits=10,
        decimal_places=2,
    )
    image: str | None = Field(default=None, max_length=512)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)


class ProductUpdate(BaseModel):
    """All fields optional — PATCH semantics."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    category_id: int | None = None
    price: Decimal | None = Field(default=None, ge=Decimal("0"), max_digits=10, decimal_places=2)
    cost: Decimal | None = Field(default=None, ge=Decimal("0"), max_digits=10, decimal_places=2)
    image: str | None = Field(default=None, max_length=512)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None


class CategoryRead(BaseModel):
    """Read-only category for the POS rail (M12). Counts are derived client-side."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    default_station: Station


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category_id: int | None
    price: Decimal
    cost: Decimal
    image: str | None
    sku: str | None
    barcode: str | None
    is_active: bool
    # M13: true when the product has at least one active modifier — the POS
    # uses it to show a customise dot and open the modifier picker on tap.
    has_modifiers: bool
    created_at: datetime
    updated_at: datetime
