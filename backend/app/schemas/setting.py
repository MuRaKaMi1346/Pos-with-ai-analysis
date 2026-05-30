"""Store settings schemas (M10).

``SettingsRead`` is the effective config (env defaults overlaid with DB
overrides). ``SettingsUpdate`` is a partial admin patch — only the keys
present are written.
"""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.models.order import OrderChannel

RoundingMode = Literal["TWO_DECIMALS", "NEAREST_BAHT"]


class SettingsRead(BaseModel):
    store_name: str
    store_address: str | None
    store_tax_id: str | None
    currency: str
    vat_rate: Decimal
    tax_inclusive: bool
    service_charge_rate: Decimal
    service_charge_before_vat: bool
    rounding_mode: RoundingMode
    default_channel: OrderChannel
    loyalty_baht_per_earn_point: Decimal
    loyalty_baht_per_redeem_point: Decimal
    receipt_footer: str | None
    receipt_pdf_enabled: bool
    printer_name: str | None


class SettingsUpdate(BaseModel):
    store_name: str | None = Field(default=None, min_length=1, max_length=120)
    store_address: str | None = Field(default=None, max_length=255)
    store_tax_id: str | None = Field(default=None, max_length=30)
    currency: str | None = Field(default=None, min_length=1, max_length=8)
    vat_rate: Decimal | None = Field(default=None, ge=0, le=1, max_digits=5, decimal_places=4)
    tax_inclusive: bool | None = None
    service_charge_rate: Decimal | None = Field(
        default=None, ge=0, le=1, max_digits=5, decimal_places=4
    )
    service_charge_before_vat: bool | None = None
    rounding_mode: RoundingMode | None = None
    default_channel: OrderChannel | None = None
    loyalty_baht_per_earn_point: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    loyalty_baht_per_redeem_point: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=4
    )
    receipt_footer: str | None = Field(default=None, max_length=255)
    receipt_pdf_enabled: bool | None = None
    printer_name: str | None = Field(default=None, max_length=120)
