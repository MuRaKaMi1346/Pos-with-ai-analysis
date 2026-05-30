"""Customer + loyalty schemas (M7)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=255)


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    phone: str | None
    email: str | None
    note: str | None
    loyalty_points: int
    total_spend: Decimal
    total_visits: int
    last_visit_at: datetime | None
    pending_redemption_baht: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LoyaltyRedeemBody(BaseModel):
    points: int = Field(ge=1)


class LoyaltyRedeemResult(BaseModel):
    """Returned from ``POST /customers/{id}/loyalty/redeem``."""

    points_redeemed: int
    discount_amount: Decimal
    points_remaining: int
    pending_redemption_baht: Decimal
