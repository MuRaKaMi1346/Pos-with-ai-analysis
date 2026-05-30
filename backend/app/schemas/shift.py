"""Cashier shift + cash drawer schemas (M8)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.shift import CashMovementType


class ShiftOpenBody(BaseModel):
    opening_float: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class ShiftCloseBody(BaseModel):
    closing_cash_counted: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    closing_note: str | None = Field(default=None, max_length=255)


class ShiftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    opening_float: Decimal
    closing_cash_counted: Decimal | None
    expected_cash: Decimal | None
    cash_variance: Decimal | None
    closing_note: str | None
    opened_at: datetime
    closed_at: datetime | None
    is_open: bool


class CashMovementBody(BaseModel):
    type: CashMovementType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    reason: str | None = Field(default=None, max_length=255)


class CashMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cashier_shift_id: int
    type: CashMovementType
    amount: Decimal
    reason: str | None
    user_id: int
    created_at: datetime
