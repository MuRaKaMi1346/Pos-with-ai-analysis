"""AI / forecasting schemas."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ForecastPoint(BaseModel):
    date: date
    predicted_qty: float


class ForecastResponse(BaseModel):
    product_id: int
    horizon: int
    points: list[ForecastPoint]


class TrainResponse(BaseModel):
    trained: list[int]
    skipped: list[int]


class PurchaseSuggestionRow(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    current_stock: Decimal
    forecast_required: Decimal
    suggested_order_qty: Decimal


class PurchaseSuggestionResponse(BaseModel):
    days: int
    rows: list[PurchaseSuggestionRow]
