"""Dashboard endpoints — all admin-only (financial data)."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import DBSessionDep, require_role
from app.models import Role
from app.schemas.dashboard import (
    CategoryMixRow,
    Granularity,
    PeakHoursCell,
    SalesTrendResponse,
    SummaryResponse,
    TopProductRow,
)
from app.services import dashboard_service

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("/summary", response_model=SummaryResponse)
def summary(
    session: DBSessionDep,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
) -> SummaryResponse:
    return dashboard_service.get_summary(session, from_, to)


@router.get("/sales-trend", response_model=SalesTrendResponse)
def sales_trend(
    session: DBSessionDep,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
    granularity: Granularity = "day",
) -> SalesTrendResponse:
    return dashboard_service.get_sales_trend(session, from_, to, granularity)


@router.get("/top-products", response_model=list[TopProductRow])
def top_products(
    session: DBSessionDep,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
) -> list[TopProductRow]:
    return dashboard_service.get_top_products(session, from_, to, limit)


@router.get("/peak-hours", response_model=list[PeakHoursCell])
def peak_hours(
    session: DBSessionDep,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
) -> list[PeakHoursCell]:
    return dashboard_service.get_peak_hours(session, from_, to)


@router.get("/category-mix", response_model=list[CategoryMixRow])
def category_mix(
    session: DBSessionDep,
    from_: Annotated[date | None, Query(alias="from")] = None,
    to: Annotated[date | None, Query()] = None,
) -> list[CategoryMixRow]:
    return list(dashboard_service.get_category_mix(session, from_, to))
