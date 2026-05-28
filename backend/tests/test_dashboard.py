"""Tests for /api/v1/dashboard/* — verifies the GROUP BY aggregates.

Direct-insert orders (no stock side-effects) so we can control created_at +
status easily and keep tests fast.
"""

import itertools
from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import (
    Category,
    Order,
    OrderItem,
    OrderStatus,
    Product,
)
from app.utils.datetime import now_utc

_seq = itertools.count(1)


def _on() -> str:
    return f"T-DASH-{next(_seq):05d}"


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="dashboard_data")
def dashboard_data_fixture(session: Session) -> dict[str, object]:
    """Latte product (65 baht, cost 18). Four orders: 3 today (qty 2/1/3), 1 yesterday (qty 1).

    Revenue total = 130 + 65 + 195 + 65 = 455
    Orders = 4
    COGS = (2+1+3+1) * 18 = 126
    Profit = 455 - 126 = 329
    Avg ticket = 113.75
    """
    cat = Category(name="Coffee")
    session.add(cat)
    session.commit()
    session.refresh(cat)

    latte = Product(
        name="Latte",
        category_id=cat.id,
        price=Decimal("65.00"),
        cost=Decimal("18.00"),
    )
    session.add(latte)
    session.commit()
    session.refresh(latte)

    now = now_utc()
    yesterday = now - timedelta(days=1)

    for created, qty in [
        (now, 2),
        (now, 1),
        (now, 3),
        (yesterday, 1),
    ]:
        order = Order(
            order_number=_on(),
            total=Decimal("65.00") * qty,
            status=OrderStatus.OPEN,
            created_at=created,
        )
        session.add(order)
        session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=latte.id,
                qty=qty,
                unit_price=Decimal("65.00"),
            )
        )

    # One voided order — must be excluded from every aggregate
    voided = Order(
        order_number=_on(),
        total=Decimal("9999.00"),
        status=OrderStatus.VOIDED,
        created_at=now,
    )
    session.add(voided)
    session.flush()
    session.add(
        OrderItem(
            order_id=voided.id,
            product_id=latte.id,
            qty=99,
            unit_price=Decimal("9999.00"),
        )
    )
    session.commit()

    return {"product": latte, "category": cat}


# ── Auth ─────────────────────────────────────────────────────────────


def test_dashboard_requires_admin(client: TestClient, staff_token: str) -> None:
    response = client.get("/api/v1/dashboard/summary", headers=_bearer(staff_token))
    assert response.status_code == 403


def test_dashboard_requires_login(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401


# ── Summary ──────────────────────────────────────────────────────────


def test_summary_returns_expected_numbers(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get("/api/v1/dashboard/summary", headers=_bearer(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert Decimal(body["total_revenue"]) == Decimal("455.00")
    assert body["order_count"] == 4
    assert Decimal(body["gross_profit"]) == Decimal("329.00")
    assert Decimal(body["average_ticket"]) == Decimal("113.75")


def test_summary_excludes_voided(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    # Voided order has total=9999 — if it leaked, revenue would jump
    response = client.get("/api/v1/dashboard/summary", headers=_bearer(admin_token))
    assert Decimal(response.json()["total_revenue"]) == Decimal("455.00")


def test_summary_empty_range(client: TestClient, admin_token: str) -> None:
    response = client.get(
        "/api/v1/dashboard/summary?from=2020-01-01&to=2020-01-02",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    body = response.json()
    assert Decimal(body["total_revenue"]) == Decimal("0")
    assert body["order_count"] == 0
    assert Decimal(body["average_ticket"]) == Decimal("0")


# ── Sales trend ──────────────────────────────────────────────────────


def test_sales_trend_buckets_by_day(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get(
        "/api/v1/dashboard/sales-trend?granularity=day",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["granularity"] == "day"
    # Today + yesterday buckets
    assert len(body["points"]) >= 2
    totals = {p["bucket"]: Decimal(p["revenue"]) for p in body["points"]}
    assert Decimal("455") == sum(totals.values())


def test_sales_trend_hour_granularity(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get(
        "/api/v1/dashboard/sales-trend?granularity=hour",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["granularity"] == "hour"
    assert len(body["points"]) >= 1


# ── Top products ─────────────────────────────────────────────────────


def test_top_products(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get(
        "/api/v1/dashboard/top-products?limit=10",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    row = rows[0]
    assert row["product_name"] == "Latte"
    assert row["quantity_sold"] == 7
    assert Decimal(row["revenue"]) == Decimal("455")
    # gross_profit = 7 * (65 - 18) = 329
    assert Decimal(row["gross_profit"]) == Decimal("329")


# ── Peak hours ───────────────────────────────────────────────────────


def test_peak_hours_returns_cells(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get("/api/v1/dashboard/peak-hours", headers=_bearer(admin_token))
    assert response.status_code == 200
    cells = response.json()
    assert len(cells) >= 1
    for cell in cells:
        assert 0 <= cell["weekday"] <= 6
        assert 0 <= cell["hour"] <= 23
        assert cell["order_count"] >= 1


# ── Category mix ─────────────────────────────────────────────────────


def test_category_mix_shares_total_100(
    client: TestClient,
    admin_token: str,
    dashboard_data: dict[str, object],
) -> None:
    _ = dashboard_data
    response = client.get("/api/v1/dashboard/category-mix", headers=_bearer(admin_token))
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["category_name"] == "Coffee"
    assert Decimal(rows[0]["revenue"]) == Decimal("455")
    # Single category -> 100%
    assert Decimal(rows[0]["share_pct"]) == Decimal("100.00")
