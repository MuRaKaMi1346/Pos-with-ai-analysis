"""Forecasting orchestration.

Pulls daily sales history from the DB → trains a LightGBM model per product →
serializes via ``registry`` → serves forecasts + ingredient purchase suggestions.
"""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlmodel import Session, select

from app.ai.forecasting import registry
from app.ai.forecasting.lgbm_model import LgbmForecaster
from app.models import Ingredient, Product, Recipe
from app.repositories import inventory_repo


def get_history(session: Session, product_id: int) -> pd.DataFrame:
    """Daily qty sold for one product. Missing days filled with 0."""
    rows = session.execute(
        text(
            """
            SELECT DATE(o.created_at) AS d, SUM(oi.qty) AS qty
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = :pid
              AND o.status IN ('OPEN', 'PAID')
            GROUP BY d
            ORDER BY d ASC
            """
        ),
        {"pid": product_id},
    ).all()

    if not rows:
        return pd.DataFrame(columns=["date", "qty"])

    df = pd.DataFrame([{"date": pd.to_datetime(r.d).date(), "qty": int(r.qty)} for r in rows])
    # Fill missing days with 0
    full_range = pd.date_range(df["date"].min(), df["date"].max(), freq="D").date
    df = (
        df.set_index("date")
        .reindex(full_range, fill_value=0)
        .reset_index()
        .rename(columns={"index": "date"})
    )
    return df


def train_product_model(
    session: Session,
    product_id: int,
    *,
    min_history: int = LgbmForecaster.MIN_HISTORY,
) -> bool:
    """Train + save one product. Returns True on success, False if too little history."""
    history = get_history(session, product_id)
    if len(history) < min_history:
        return False
    model = LgbmForecaster()
    model.train(history)
    registry.save_model(product_id, model)
    return True


def train_all(session: Session) -> dict[str, list[int]]:
    """Train every active product. Returns ``{trained: [...], skipped: [...]}``."""
    products = list(
        session.exec(select(Product).where(Product.is_active.is_(True))).all()  # type: ignore[attr-defined]
    )
    trained: list[int] = []
    skipped: list[int] = []
    for product in products:
        if product.id is None:
            continue
        if train_product_model(session, product.id):
            trained.append(product.id)
        else:
            skipped.append(product.id)
    return {"trained": trained, "skipped": skipped}


def forecast_product(product_id: int, horizon: int = 14) -> list[dict[str, Any]]:
    """Load a saved model and forecast ``horizon`` days ahead. Empty list if no model."""
    model = registry.load_model(product_id)
    if model is None:
        return []
    preds = model.predict(horizon)
    last = model.last_history["date"].iloc[-1]
    if hasattr(last, "date"):
        last_date = last.date()
    elif isinstance(last, date):
        last_date = last
    else:
        last_date = pd.to_datetime(last).date()
    return [
        {"date": last_date + timedelta(days=i + 1), "predicted_qty": float(preds[i])}
        for i in range(horizon)
    ]


def purchase_suggestion(session: Session, days: int = 14) -> list[dict[str, Any]]:
    """Forecast every product → roll up ingredient requirements via BOM → subtract stock."""
    requirements: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))

    products = list(
        session.exec(select(Product).where(Product.is_active.is_(True))).all()  # type: ignore[attr-defined]
    )
    for product in products:
        if product.id is None:
            continue
        forecast = forecast_product(product.id, horizon=days)
        if not forecast:
            continue
        total_qty = sum(point["predicted_qty"] for point in forecast)
        recipes = session.exec(select(Recipe).where(Recipe.product_id == product.id)).all()
        for recipe in recipes:
            requirements[recipe.ingredient_id] += recipe.qty * Decimal(str(total_qty))

    rows: list[dict[str, Any]] = []
    for ingredient_id, required in requirements.items():
        ingredient = session.get(Ingredient, ingredient_id)
        if ingredient is None:
            continue
        stock = inventory_repo.get_stock(session, ingredient_id)
        on_hand = stock.quantity if stock else Decimal("0")
        suggested = max(Decimal("0"), required - on_hand)
        rows.append(
            {
                "ingredient_id": ingredient_id,
                "ingredient_name": ingredient.name,
                "unit": ingredient.unit.value,
                "current_stock": on_hand,
                "forecast_required": required.quantize(Decimal("0.01")),
                "suggested_order_qty": suggested.quantize(Decimal("0.01")),
            }
        )
    rows.sort(key=lambda r: r["suggested_order_qty"], reverse=True)
    return rows
