"""Strategy schemas (insight + daily response)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class StrategyInsight(BaseModel):
    type: str  # "bundle" | "star" | "slow_mover" | "high_margin"
    title: str
    description: str
    data: dict[str, Any]


class StrategyResponse(BaseModel):
    generated_at: datetime
    days: int
    insights: list[StrategyInsight]
    summary_th: str | None
