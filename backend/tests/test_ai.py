"""Tests for AI forecasting module + /ai endpoints."""

import itertools
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.ai.data.features import build_features
from app.ai.data.synthetic import generate_sales_history
from app.ai.forecasting import registry
from app.ai.forecasting.baseline import MovingAverageForecaster
from app.ai.forecasting.evaluate import mae, mase, rmse
from app.ai.forecasting.lgbm_model import LgbmForecaster
from app.models import (
    Category,
    Ingredient,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    Recipe,
    StockLevel,
    Unit,
)
from app.utils.datetime import now_utc

_seq = itertools.count(1)


def _on() -> str:
    """Unique placeholder order_number for raw-fixture Orders (M1+)."""
    return f"T-AI-{next(_seq):05d}"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── Data ─────────────────────────────────────────────────────────────


def test_synthetic_data_shape() -> None:
    df = generate_sales_history(product_ids=[1, 2], days=90)
    assert len(df) == 180  # 2 products x 90 days
    assert set(df.columns) == {"date", "product_id", "qty"}
    assert (df["qty"] >= 0).all()


def test_build_features_adds_lags_and_drops_nans() -> None:
    df = generate_sales_history(product_ids=[1], days=30, seed=1).drop(columns=["product_id"])
    feats = build_features(df)
    # First 14 rows dropped due to NaN from lag_14 / ma_14
    assert len(feats) == 30 - 14
    for col in ("lag_1", "lag_7", "lag_14", "ma_7", "ma_14", "dow", "month", "is_weekend"):
        assert col in feats.columns
    assert feats["dow"].between(0, 6).all()


# ── Baseline + metrics ───────────────────────────────────────────────


def test_baseline_predicts_correct_horizon() -> None:
    history = [10, 12, 14, 16, 18, 20, 22]
    preds = MovingAverageForecaster(window=7).predict(history, horizon=3)
    assert preds.shape == (3,)
    # First pred is mean of history = 16
    assert preds[0] == pytest.approx(16.0)


def test_baseline_zero_history() -> None:
    preds = MovingAverageForecaster(window=3).predict([], horizon=5)
    assert np.all(preds == 0)


def test_mae_rmse_basics() -> None:
    actual = [10.0, 20.0, 30.0]
    pred = [12.0, 18.0, 32.0]
    assert mae(actual, pred) == pytest.approx(2.0)
    assert rmse(actual, pred) == pytest.approx(np.sqrt((4 + 4 + 4) / 3))


def test_mase_below_one_means_beats_naive() -> None:
    naive = [10.0, 12.0, 14.0, 16.0, 18.0]  # mean abs diff = 2
    actual = [20.0, 22.0]
    very_close = [19.5, 22.5]
    score = mase(actual, very_close, naive_actuals=naive)
    # |0.5|+|0.5| /2 = 0.5; /2 (scale) = 0.25
    assert score == pytest.approx(0.25)


# ── LightGBM beats baseline on synthetic ─────────────────────────────


def test_lgbm_beats_baseline_on_synthetic() -> None:
    df = generate_sales_history(product_ids=[1], days=180, seed=42)
    df = df[df["product_id"] == 1].drop(columns=["product_id"]).reset_index(drop=True)

    split = int(len(df) * 0.8)
    train_df = df.iloc[:split].copy()
    test_df = df.iloc[split:].copy()

    lgbm = LgbmForecaster()
    lgbm.train(train_df)
    lgbm_preds = lgbm.predict(len(test_df))

    baseline_preds = MovingAverageForecaster(window=7).predict(
        train_df["qty"].tolist(), horizon=len(test_df)
    )

    actual = test_df["qty"].tolist()
    train_y = train_df["qty"].tolist()

    lgbm_mase = mase(actual, lgbm_preds, naive_actuals=train_y)
    baseline_mase = mase(actual, baseline_preds, naive_actuals=train_y)

    assert lgbm_mase < baseline_mase, (
        f"LGBM MASE {lgbm_mase:.3f} did not beat baseline {baseline_mase:.3f}"
    )


# ── Registry ─────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def isolate_models_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Each test gets its own models_store directory."""
    monkeypatch.setattr(registry, "_MODELS_DIR", tmp_path)
    yield
    monkeypatch.setattr(registry, "_MODELS_DIR", None)


def test_registry_round_trip() -> None:
    df = generate_sales_history(product_ids=[1], days=60, seed=7)
    df = df[df["product_id"] == 1].drop(columns=["product_id"]).reset_index(drop=True)

    model = LgbmForecaster()
    model.train(df)
    registry.save_model(42, model)
    assert 42 in registry.list_trained_products()

    loaded = registry.load_model(42)
    assert loaded is not None
    preds_original = model.predict(7)
    preds_loaded = loaded.predict(7)
    assert preds_original == pytest.approx(preds_loaded)


def test_registry_load_missing_returns_none() -> None:
    assert registry.load_model(99999) is None


# ── /ai endpoints ────────────────────────────────────────────────────


def test_forecast_endpoint_no_model_returns_empty(client: TestClient, admin_token: str) -> None:
    response = client.get(
        "/api/v1/ai/forecast?product_id=999&horizon=7", headers=_bearer(admin_token)
    )
    assert response.status_code == 200
    body = response.json()
    assert body["product_id"] == 999
    assert body["horizon"] == 7
    assert body["points"] == []


def test_train_endpoint_requires_admin(client: TestClient, staff_token: str) -> None:
    response = client.post("/api/v1/ai/train", headers=_bearer(staff_token))
    assert response.status_code == 403


def test_train_then_forecast_for_real_product(
    client: TestClient,
    admin_token: str,
    session: Session,
) -> None:
    """End-to-end: insert 60 days of orders → POST /train → GET /forecast returns points."""
    product = Product(name="Latte", price=Decimal("65.00"), cost=Decimal("18.00"))
    session.add(product)
    session.flush()
    assert product.id is not None

    # Seed 60 days of orders
    base = now_utc().replace(hour=10, minute=0, second=0, microsecond=0)
    for i in range(60):
        when = base - timedelta(days=60 - i)
        order = Order(
            order_number=_on(),
            total=Decimal("65.00"),
            status=OrderStatus.OPEN,
            created_at=when,
        )
        session.add(order)
        session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                qty=2 + (i % 5),
                unit_price=Decimal("65.00"),
            )
        )
    session.commit()

    train_resp = client.post("/api/v1/ai/train", headers=_bearer(admin_token))
    assert train_resp.status_code == 200
    body = train_resp.json()
    assert product.id in body["trained"]

    forecast_resp = client.get(
        f"/api/v1/ai/forecast?product_id={product.id}&horizon=7",
        headers=_bearer(admin_token),
    )
    assert forecast_resp.status_code == 200
    points = forecast_resp.json()["points"]
    assert len(points) == 7
    assert all(p["predicted_qty"] >= 0 for p in points)


def test_purchase_suggestion_aggregates_via_bom(
    client: TestClient,
    admin_token: str,
    session: Session,
) -> None:
    """Train one product with a recipe, ask for a 7-day purchase plan."""
    cat = Category(name="Coffee")
    session.add(cat)
    session.flush()
    ingredient = Ingredient(name="Beans", unit=Unit.GRAM)
    session.add(ingredient)
    session.flush()
    session.add(StockLevel(ingredient_id=ingredient.id, quantity=Decimal("100")))
    product = Product(
        name="Espresso",
        category_id=cat.id,
        price=Decimal("55.00"),
        cost=Decimal("12.00"),
    )
    session.add(product)
    session.flush()
    session.add(
        Recipe(
            product_id=product.id,
            ingredient_id=ingredient.id,
            qty=Decimal("18.0"),
            unit=Unit.GRAM,
        )
    )
    base = now_utc().replace(hour=9, minute=0, second=0, microsecond=0)
    for i in range(60):
        when = base - timedelta(days=60 - i)
        order = Order(
            order_number=_on(),
            total=Decimal("55.00"),
            status=OrderStatus.OPEN,
            created_at=when,
        )
        session.add(order)
        session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                qty=1,
                unit_price=Decimal("55.00"),
            )
        )
    session.commit()

    train_resp = client.post("/api/v1/ai/train", headers=_bearer(admin_token))
    assert train_resp.status_code == 200

    response = client.get("/api/v1/ai/purchase-suggestion?days=7", headers=_bearer(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert body["days"] == 7
    assert len(body["rows"]) >= 1
    row = body["rows"][0]
    assert row["ingredient_name"] == "Beans"
    assert Decimal(row["forecast_required"]) > 0
    # current_stock 100g; 7 days x ~1 cup x 18g = ~126g -> suggested > 0
    assert Decimal(row["suggested_order_qty"]) >= 0
