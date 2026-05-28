"""Tests for AI strategy + LLM summarizer + /ai/strategy/daily."""

import itertools
from decimal import Decimal
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.ai.llm import summarizer
from app.ai.strategy import margin, market_basket, recommender
from app.core.config import get_settings
from app.models import Category, Order, OrderItem, OrderStatus, Product
from app.utils.datetime import now_utc

# Unique-per-call placeholder so fixtures satisfy the NOT NULL/unique
# ``order_number`` introduced in M1 without needing the live generator.
_seq = itertools.count(1)


def _on() -> str:
    return f"T-STRAT-{next(_seq):05d}"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── Fixture: 10 orders, 7 bundle latte+croissant + 3 solo juice ──────


@pytest.fixture(name="basket_data")
def basket_data_fixture(session: Session) -> dict[str, Product]:
    cat = Category(name="Coffee")
    session.add(cat)
    session.flush()

    latte = Product(
        name="Latte",
        category_id=cat.id,
        price=Decimal("65"),
        cost=Decimal("18"),
    )
    croissant = Product(
        name="Croissant",
        category_id=cat.id,
        price=Decimal("45"),
        cost=Decimal("15"),
    )
    juice = Product(
        name="Juice",
        category_id=cat.id,
        price=Decimal("55"),
        cost=Decimal("20"),
    )
    for p in (latte, croissant, juice):
        session.add(p)
    session.commit()
    for p in (latte, croissant, juice):
        session.refresh(p)

    now = now_utc()
    for _ in range(7):
        order = Order(
            order_number=_on(),
            total=Decimal("110"),
            status=OrderStatus.OPEN,
            created_at=now,
        )
        session.add(order)
        session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=latte.id,
                qty=1,
                unit_price=Decimal("65"),
            )
        )
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=croissant.id,
                qty=1,
                unit_price=Decimal("45"),
            )
        )

    # 3 single-item orders — excluded from market basket
    for _ in range(3):
        order = Order(
            order_number=_on(),
            total=Decimal("55"),
            status=OrderStatus.OPEN,
            created_at=now,
        )
        session.add(order)
        session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=juice.id,
                qty=1,
                unit_price=Decimal("55"),
            )
        )
    session.commit()
    return {"latte": latte, "croissant": croissant, "juice": juice}


# ── Helpers to stub httpx.Client ─────────────────────────────────────


class _FakeResponse:
    def __init__(self, body: dict[str, Any]) -> None:
        self._body = body

    def raise_for_status(self) -> None:
        pass

    def json(self) -> dict[str, Any]:
        return self._body


class _FakeClient:
    def __init__(self, response_body: dict[str, Any] | None, exc: Exception | None) -> None:
        self._body = response_body
        self._exc = exc

    def __enter__(self) -> "_FakeClient":
        return self

    def __exit__(self, *args: object) -> None:
        pass

    def post(self, *_args: object, **_kwargs: object) -> _FakeResponse:
        if self._exc is not None:
            raise self._exc
        assert self._body is not None
        return _FakeResponse(self._body)


def _patch_ollama(
    monkeypatch: pytest.MonkeyPatch,
    *,
    response_body: dict[str, Any] | None = None,
    exc: Exception | None = None,
) -> None:
    def factory(*_args: object, **_kwargs: object) -> _FakeClient:
        return _FakeClient(response_body, exc)

    monkeypatch.setattr(httpx, "Client", factory)


# ── Market basket ────────────────────────────────────────────────────


def test_market_basket_finds_latte_croissant_pair(
    session: Session, basket_data: dict[str, Product]
) -> None:
    _ = basket_data
    rules = market_basket.find_rules(session, days=7, min_support=0.5, min_lift=1.0, top_n=5)
    assert rules, "expected at least one rule"
    pair_names: set[frozenset[str]] = {
        frozenset(r["antecedent_names"] + r["consequent_names"]) for r in rules
    }
    assert frozenset({"Latte", "Croissant"}) in pair_names


def test_market_basket_too_few_transactions_returns_empty(session: Session) -> None:
    assert market_basket.find_rules(session, days=7) == []


# ── Margin ───────────────────────────────────────────────────────────


def test_margin_identifies_slow_mover(session: Session, basket_data: dict[str, Product]) -> None:
    _ = basket_data
    out = margin.compute(session, days=7)
    slow_names = [s["name"] for s in out["slow_movers"]]
    assert "Juice" in slow_names  # only 3 units vs Latte/Croissant 7


# ── Recommender ──────────────────────────────────────────────────────


def test_recommender_yields_mixed_insights(
    session: Session, basket_data: dict[str, Product]
) -> None:
    _ = basket_data
    insights = recommender.recommend(session, days=7)
    types = {i["type"] for i in insights}
    assert "bundle" in types
    assert "star" in types or "high_margin" in types
    assert "slow_mover" in types


# ── Summarizer ───────────────────────────────────────────────────────


def test_summarizer_returns_none_for_empty_insights() -> None:
    assert summarizer.summarize_th([], get_settings()) is None


def test_summarizer_returns_none_on_ollama_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_ollama(monkeypatch, exc=httpx.ConnectError("ollama unavailable"))
    result = summarizer.summarize_th([{"title": "x", "description": "y"}], get_settings())
    assert result is None


def test_summarizer_returns_trimmed_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _patch_ollama(monkeypatch, response_body={"response": "  สรุปทดสอบ\n"})
    result = summarizer.summarize_th([{"title": "x", "description": "y"}], get_settings())
    assert result == "สรุปทดสอบ"


# ── Endpoint ─────────────────────────────────────────────────────────


def test_strategy_daily_admin_only(
    client: TestClient, staff_token: str, basket_data: dict[str, Product]
) -> None:
    _ = basket_data
    response = client.get("/api/v1/ai/strategy/daily", headers=_bearer(staff_token))
    assert response.status_code == 403


def test_strategy_daily_returns_insights_and_summary(
    client: TestClient,
    admin_token: str,
    basket_data: dict[str, Product],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _ = basket_data
    _patch_ollama(monkeypatch, response_body={"response": "สรุปจาก Ollama"})

    response = client.get("/api/v1/ai/strategy/daily?days=7", headers=_bearer(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert body["days"] == 7
    assert len(body["insights"]) > 0
    assert body["summary_th"] == "สรุปจาก Ollama"


def test_strategy_daily_summary_null_when_ollama_down(
    client: TestClient,
    admin_token: str,
    basket_data: dict[str, Product],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _ = basket_data
    _patch_ollama(monkeypatch, exc=httpx.ConnectError("ollama down"))

    response = client.get("/api/v1/ai/strategy/daily?days=7", headers=_bearer(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert body["summary_th"] is None
    # Insights still present (structured part doesn't depend on Ollama)
    assert len(body["insights"]) > 0
