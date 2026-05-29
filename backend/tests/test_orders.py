"""Tests for /api/v1/orders — the BOM stock deduction flow.

This is the headline acceptance test for Step 3: a sale must atomically
(1) create the Order + items, (2) deduct ingredient stock per BOM,
(3) record StockMovement(type=sale, qty<0), and (4) compute total correctly.
On insufficient stock, the whole thing rolls back.
"""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    Modifier,
    MovementType,
    Product,
    StockLevel,
    StockMovement,
)


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── Happy path ───────────────────────────────────────────────────────


def test_create_order_does_not_deduct_stock_until_sent(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    """M3 timing change: create returns 201 + bill, but stock is untouched."""
    _ = stocked_pantry
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 2}]},
    )
    assert response.status_code == 201
    body = response.json()
    # Default Thai POS: VAT inclusive 7%, no service charge → total = subtotal = 65*2.
    assert Decimal(body["subtotal"]) == Decimal("130.00")
    assert Decimal(body["total"]) == Decimal("130.00")
    assert Decimal(body["tax_total"]) == Decimal("8.50")
    assert body["status"] == "open"
    assert body["sent_to_kitchen_at"] is None
    assert body["items"][0]["kitchen_status"] == "pending"
    # Stock untouched: 1000g + 5000ml unchanged.
    stocks = {s.ingredient_id: s.quantity for s in session.exec(select(StockLevel)).all()}
    assert Decimal("1000") in stocks.values()
    assert Decimal("5000") in stocks.values()
    assert session.exec(select(StockMovement)).all() == []


def test_send_to_kitchen_deducts_stock_per_bom(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    """Stock deduction now happens at send-to-kitchen, atomically."""
    _ = stocked_pantry
    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 2}]},
    )
    assert create.status_code == 201
    order_id = create.json()["id"]
    send = client.post(f"/api/v1/orders/{order_id}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 200
    body = send.json()
    assert body["sent_to_kitchen_at"] is not None
    assert body["items"][0]["kitchen_status"] == "preparing"

    stocks = {s.ingredient_id: s.quantity for s in session.exec(select(StockLevel)).all()}
    assert Decimal("964") in stocks.values()  # 1000 - 18*2
    assert Decimal("4640") in stocks.values()  # 5000 - 180*2
    sale_movements = session.exec(
        select(StockMovement).where(StockMovement.type == MovementType.SALE)
    ).all()
    assert len(sale_movements) == 2
    for m in sale_movements:
        assert m.qty < 0
        assert m.ref is not None
        assert m.ref.startswith("order:")


def test_create_order_with_modifier_adds_to_total(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    modifier_extra_shot: Modifier,
) -> None:
    _ = stocked_pantry
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={
            "items": [
                {
                    "product_id": product_latte.id,
                    "qty": 1,
                    "modifier_ids": [modifier_extra_shot.id],
                }
            ]
        },
    )
    assert response.status_code == 201
    body = response.json()
    # 65 + 10 = 75
    assert Decimal(body["total"]) == Decimal("75.00")
    assert len(body["items"][0]["modifiers"]) == 1
    assert body["items"][0]["modifiers"][0]["price_delta"] == "10.00"


# ── Insufficient stock — must NOT mutate anything ────────────────────


def test_send_to_kitchen_insufficient_stock_returns_409_and_rolls_back(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    ingredient_beans,  # type: ignore[no-untyped-def]
    session: Session,
) -> None:
    """Pre-send the bill happily exists; send-to-kitchen is what catches stock."""
    # Only 10g beans — Latte needs 18g
    session.add(StockLevel(ingredient_id=ingredient_beans.id, quantity=Decimal("10")))
    session.commit()

    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert create.status_code == 201  # bill created — no stock check yet
    order_id = create.json()["id"]

    send = client.post(f"/api/v1/orders/{order_id}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 409
    assert send.json()["code"] == "conflict"
    assert "insufficient_stock" in send.json()["message"]

    # Rollback verification: no movements, beans stock unchanged at 10.
    movements = session.exec(select(StockMovement)).all()
    assert len(movements) == 0
    beans_stock = session.exec(
        select(StockLevel).where(StockLevel.ingredient_id == ingredient_beans.id)
    ).first()
    assert beans_stock is not None
    assert beans_stock.quantity == Decimal("10")


def test_create_order_unknown_product_returns_404(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": 9999, "qty": 1}]},
    )
    assert response.status_code == 404


def test_create_order_empty_items_returns_422(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": []},
    )
    assert response.status_code == 422


def test_create_order_unknown_modifier_returns_404(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1, "modifier_ids": [9999]}]},
    )
    assert response.status_code == 404


# ── List / Get ───────────────────────────────────────────────────────


# ── M1: channel + table + per-day order_number ───────────────────────


def test_create_order_persists_channel_and_table(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={
            "items": [{"product_id": product_latte.id, "qty": 1}],
            "channel": "dine_in",
            "table_number": "A3",
            "tip": "20.00",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["channel"] == "dine_in"
    assert body["table_number"] == "A3"
    assert Decimal(body["tip_total"]) == Decimal("20.00")
    # tip flows into total even when inclusive: 65 + 20 = 85.00
    assert Decimal(body["total"]) == Decimal("85.00")


def test_order_number_is_per_day_sequential(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry

    def _create() -> str:
        r = client.post(
            "/api/v1/orders/",
            headers=_bearer(admin_token),
            json={"items": [{"product_id": product_latte.id, "qty": 1}]},
        )
        r.raise_for_status()
        return str(r.json()["order_number"])

    n1 = _create()
    n2 = _create()
    n3 = _create()
    prefix1, suffix1 = n1.split("-")
    prefix2, suffix2 = n2.split("-")
    prefix3, suffix3 = n3.split("-")
    assert prefix1 == prefix2 == prefix3, "same UTC day → same prefix"
    assert int(suffix1) + 1 == int(suffix2)
    assert int(suffix2) + 1 == int(suffix3)


def test_create_order_invalid_table_too_long_returns_422(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    response = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={
            "items": [{"product_id": product_latte.id, "qty": 1}],
            "table_number": "X" * 17,
        },
    )
    assert response.status_code == 422


def test_list_and_get_order(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert create.status_code == 201
    order_id = create.json()["id"]

    listing = client.get("/api/v1/orders/", headers=_bearer(admin_token))
    assert listing.status_code == 200
    assert any(o["id"] == order_id for o in listing.json())

    detail = client.get(f"/api/v1/orders/{order_id}", headers=_bearer(admin_token))
    assert detail.status_code == 200
    assert detail.json()["id"] == order_id
    assert len(detail.json()["items"]) == 1
