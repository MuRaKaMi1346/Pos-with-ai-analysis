"""Daily-strategy orchestration: recommender + optional Ollama summary."""

from sqlmodel import Session

from app.ai.llm import summarizer
from app.ai.strategy import recommender
from app.core.config import Settings
from app.schemas.strategy import StrategyInsight, StrategyResponse
from app.utils.datetime import now_utc


def generate_daily_strategy(
    session: Session,
    settings: Settings,
    *,
    days: int = 30,
) -> StrategyResponse:
    raw_insights = recommender.recommend(session, days=days)
    insights = [StrategyInsight(**i) for i in raw_insights]
    summary = summarizer.summarize_th(raw_insights, settings)
    return StrategyResponse(
        generated_at=now_utc(),
        days=days,
        insights=insights,
        summary_th=summary,
    )
