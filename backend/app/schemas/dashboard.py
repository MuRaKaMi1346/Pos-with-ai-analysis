"""Dashboard schemas — read-only aggregates returned to the frontend."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Granularity = Literal["day", "hour"]


class SummaryResponse(BaseModel):
    """KPI cards data: total revenue, order count, gross profit, avg ticket."""

    model_config = ConfigDict(populate_by_name=True)

    from_: date = Field(alias="from")
    to: date
    total_revenue: Decimal
    order_count: int
    gross_profit: Decimal
    average_ticket: Decimal


class SalesTrendPoint(BaseModel):
    bucket: str  # ISO date or "YYYY-MM-DD HH:00:00"
    revenue: Decimal
    order_count: int


class SalesTrendResponse(BaseModel):
    granularity: Granularity
    points: list[SalesTrendPoint]


class TopProductRow(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal
    gross_profit: Decimal


class PeakHoursCell(BaseModel):
    """SQLite ``%w``: 0=Sunday, 1=Monday, ..., 6=Saturday."""

    weekday: int
    hour: int
    revenue: Decimal
    order_count: int


class CategoryMixRow(BaseModel):
    category_id: int | None
    category_name: str
    revenue: Decimal
    share_pct: Decimal
