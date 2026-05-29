"""Discount + per-bill discount schemas (M4)."""

from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.discount import DiscountScope, DiscountType

# ── Master discount CRUD ────────────────────────────────────────────


class DiscountCreate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=120)
    scope: DiscountScope
    type: DiscountType
    value: Decimal = Field(ge=Decimal("0"), max_digits=12, decimal_places=4)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    min_order_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=12, decimal_places=2
    )
    max_discount_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=12, decimal_places=2
    )
    requires_admin: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def _percent_le_one(self) -> Self:
        if self.type == DiscountType.PERCENT and self.value > Decimal("1"):
            raise ValueError("percent_value_must_be_le_1")
        return self

    @model_validator(mode="after")
    def _window_in_order(self) -> Self:
        if (
            self.starts_at is not None
            and self.ends_at is not None
            and self.starts_at >= self.ends_at
        ):
            raise ValueError("starts_at_must_precede_ends_at")
        return self


class DiscountUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    value: Decimal | None = Field(default=None, ge=Decimal("0"), max_digits=12, decimal_places=4)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    min_order_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=12, decimal_places=2
    )
    max_discount_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=12, decimal_places=2
    )
    requires_admin: bool | None = None
    is_active: bool | None = None


class DiscountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str | None
    name: str
    scope: DiscountScope
    type: DiscountType
    value: Decimal
    starts_at: datetime | None
    ends_at: datetime | None
    min_order_amount: Decimal | None
    max_discount_amount: Decimal | None
    requires_admin: bool
    is_active: bool
    created_at: datetime


# ── Per-bill discount snapshots (read) ──────────────────────────────


class OrderDiscountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    discount_id: int | None
    name: str
    type: DiscountType
    value: Decimal
    amount_off: Decimal
    applied_by_user_id: int
    reason: str | None
    created_at: datetime


class OrderItemDiscountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    discount_id: int | None
    name: str
    type: DiscountType
    value: Decimal
    amount_off: Decimal
    applied_by_user_id: int
    reason: str | None
    created_at: datetime


# ── Apply discount (POST body) ──────────────────────────────────────


class ApplyDiscountBody(BaseModel):
    """Either a ``code`` lookup or a full ad-hoc spec.

    Coded form: just ``code``. Ad-hoc form: ``name`` + ``type`` + ``value``
    + ``reason``. The two are mutually exclusive; the service applies the
    admin-threshold check on top.
    """

    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: DiscountType | None = None
    value: Decimal | None = Field(default=None, ge=Decimal("0"), max_digits=12, decimal_places=4)
    reason: str | None = Field(default=None, min_length=1, max_length=255)

    @model_validator(mode="after")
    def _coded_xor_adhoc(self) -> Self:
        coded = self.code is not None
        adhoc_present = any(v is not None for v in (self.name, self.type, self.value))
        if coded and adhoc_present:
            raise ValueError("code_and_adhoc_fields_are_mutually_exclusive")
        if not coded:
            missing = [
                k
                for k, v in {
                    "name": self.name,
                    "type": self.type,
                    "value": self.value,
                    "reason": self.reason,
                }.items()
                if v is None
            ]
            if missing:
                raise ValueError(f"adhoc_missing:{','.join(missing)}")
            if (
                self.type == DiscountType.PERCENT
                and self.value is not None
                and self.value > Decimal("1")
            ):
                raise ValueError("percent_value_must_be_le_1")
        return self
