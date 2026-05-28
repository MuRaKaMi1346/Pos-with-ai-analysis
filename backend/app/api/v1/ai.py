"""AI / forecasting endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DBSessionDep, SettingsDep, require_role
from app.models import Role
from app.schemas.ai import (
    ForecastPoint,
    ForecastResponse,
    PurchaseSuggestionResponse,
    PurchaseSuggestionRow,
    TrainResponse,
)
from app.schemas.strategy import StrategyResponse
from app.services import forecast_service, strategy_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/forecast", response_model=ForecastResponse)
def forecast(
    product_id: int,
    horizon: Annotated[int, Query(ge=1, le=90)] = 14,
) -> ForecastResponse:
    """Load the saved LightGBM model for ``product_id`` and forecast ``horizon`` days.

    Returns an empty ``points`` list if the product has no trained model yet
    (caller should hit ``POST /ai/train`` first).
    """
    points_raw = forecast_service.forecast_product(product_id, horizon)
    return ForecastResponse(
        product_id=product_id,
        horizon=horizon,
        points=[
            ForecastPoint(date=p["date"], predicted_qty=p["predicted_qty"]) for p in points_raw
        ],
    )


@router.get("/purchase-suggestion", response_model=PurchaseSuggestionResponse)
def purchase_suggestion(
    session: DBSessionDep,
    days: Annotated[int, Query(ge=1, le=60)] = 14,
) -> PurchaseSuggestionResponse:
    rows = forecast_service.purchase_suggestion(session, days)
    return PurchaseSuggestionResponse(
        days=days,
        rows=[PurchaseSuggestionRow(**r) for r in rows],
    )


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def train(session: DBSessionDep) -> TrainResponse:
    """Train one LightGBM model per active product (skips those with < 30 days of history)."""
    result = forecast_service.train_all(session)
    return TrainResponse(**result)


@router.get(
    "/strategy/daily",
    response_model=StrategyResponse,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def strategy_daily(
    session: DBSessionDep,
    settings: SettingsDep,
    days: Annotated[int, Query(ge=7, le=180)] = 30,
) -> StrategyResponse:
    """Bundle / star / slow-mover insights + optional Thai summary from Ollama."""
    return strategy_service.generate_daily_strategy(session, settings, days=days)
