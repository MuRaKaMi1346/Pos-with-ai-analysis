"""Payment schemas (M5)."""

from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.payment import PaymentMethod


class TenderItem(BaseModel):
    """One row of a multi-tender ``POST /orders/{id}/pay`` body."""

    method: PaymentMethod
    amount: Decimal = Field(gt=Decimal("0"), max_digits=12, decimal_places=2)
    reference: str | None = Field(default=None, max_length=100)
    tendered_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=12, decimal_places=2
    )

    @model_validator(mode="after")
    def _cash_tendered_ge_amount(self) -> Self:
        # Customer-handed cash is checked here, before service. Non-cash
        # tenders ignore tendered_amount.
        if (
            self.method == PaymentMethod.CASH
            and self.tendered_amount is not None
            and self.tendered_amount < self.amount
        ):
            raise ValueError("tendered_lt_amount")
        return self


class PayBody(BaseModel):
    tenders: list[TenderItem] = Field(min_length=1)


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    method: PaymentMethod
    amount: Decimal
    reference: str | None
    tendered_amount: Decimal | None
    is_refund: bool
    voided: bool
    voided_at: datetime | None
    paid_at: datetime
