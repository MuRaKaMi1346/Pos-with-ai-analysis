"""M3 lifecycle tests — hold / resume / PATCH /items / send-to-kitchen / void.

Each test seeds the latte + stocked pantry, posts a bill, and drives one path
through the state machine. Stock + audit assertions live close to the action
they're proving.
"""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    MovementType,
    Product,
    StockLevel,
    StockMovement,
)


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create(client: TestClient, token: str, product_id: int, qty: int = 1) -> int:
    r = client.post(
        "/api/v1/orders/",
        headers=_bearer(token),
        json={"items": [{"product_id": product_id, "qty": qty}]},
    )
    r.raise_for_status()
    return int(r.json()["id"])


# ── Hold / resume ─────────────────────────────────────────────────────


def test_hold_then_resume_round_trip(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    hold = client.post(f"/api/v1/orders/{oid}/hold", headers=_bearer(admin_token))
    assert hold.status_code == 200
    assert hold.json()["status"] == "hold"
    resume = client.post(f"/api/v1/orders/{oid}/resume", headers=_bearer(admin_token))
    assert resume.status_code == 200
    assert resume.json()["status"] == "open"


def test_hold_blocks_send(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/hold", headers=_bearer(admin_token))
    send = client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 409
    assert "cannot_send_status" in send.json()["message"]


def test_resume_unknown_status_returns_409(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    resume = client.post(f"/api/v1/orders/{oid}/resume", headers=_bearer(admin_token))
    assert resume.status_code == 409


# ── Send to kitchen ───────────────────────────────────────────────────


def test_send_is_idempotent_409_on_second_call(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    assert (
        client.post(
            f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token)
        ).status_code
        == 200
    )
    second = client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    assert second.status_code == 409
    assert "already_sent" in second.json()["message"]


def test_send_empty_bill_returns_409(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    """All lines voided pre-send → 409 empty_bill."""
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    void = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/void",
        headers=_bearer(admin_token),
        json={"reason": "test"},
    )
    assert void.status_code == 200
    send = client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 409
    assert "empty_bill" in send.json()["message"]


# ── PATCH /items ──────────────────────────────────────────────────────


def test_patch_items_replaces_and_recomputes(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)  # qty 1, total 65
    patch = client.patch(
        f"/api/v1/orders/{oid}/items",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 3}]},
    )
    assert patch.status_code == 200
    body = patch.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["qty"] == 3
    assert Decimal(body["subtotal"]) == Decimal("195.00")
    assert Decimal(body["total"]) == Decimal("195.00")


def test_patch_items_allowed_while_hold_keeps_hold(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/hold", headers=_bearer(admin_token))
    patch = client.patch(
        f"/api/v1/orders/{oid}/items",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 2}]},
    )
    assert patch.status_code == 200
    assert patch.json()["status"] == "hold"  # PATCH doesn't auto-resume


def test_patch_items_blocked_after_send(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    patch = client.patch(
        f"/api/v1/orders/{oid}/items",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 2}]},
    )
    assert patch.status_code == 409
    assert "cannot_edit_after_send" in patch.json()["message"]


def test_patch_items_empty_list_returns_422(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    patch = client.patch(
        f"/api/v1/orders/{oid}/items",
        headers=_bearer(admin_token),
        json={"items": []},
    )
    assert patch.status_code == 422


# ── Void line ─────────────────────────────────────────────────────────


def test_void_line_pre_send_keeps_row_drops_from_total(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id, qty=2)
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    void = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/void",
        headers=_bearer(admin_token),
        json={"reason": "customer changed mind"},
    )
    assert void.status_code == 200
    body = void.json()
    assert body["items"][0]["is_voided"] is True
    assert body["items"][0]["voided_reason"] == "customer changed mind"
    assert body["items"][0]["kitchen_status"] == "cancelled"
    assert Decimal(body["subtotal"]) == Decimal("0.00")
    assert Decimal(body["total"]) == Decimal("0.00")


def test_void_line_after_send_blocked_for_staff(
    client: TestClient,
    admin_token: str,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    void = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/void",
        headers=_bearer(staff_token),
        json={"reason": "spilled"},
    )
    assert void.status_code == 403
    assert "void_after_send_admin_only" in void.json()["message"]


def test_void_line_after_send_admin_reverses_stock(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    void = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/void",
        headers=_bearer(admin_token),
        json={"reason": "spilled"},
    )
    assert void.status_code == 200
    # Stock returned to original 1000g / 5000ml.
    stocks = {s.ingredient_id: s.quantity for s in session.exec(select(StockLevel)).all()}
    assert Decimal("1000") in stocks.values()
    assert Decimal("5000") in stocks.values()
    # Returns + Sales movements both recorded.
    types = {m.type for m in session.exec(select(StockMovement)).all()}
    assert MovementType.SALE in types
    assert MovementType.RETURN in types


# ── Void bill ─────────────────────────────────────────────────────────


def test_void_bill_staff_forbidden(
    client: TestClient,
    staff_token: str,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    void = client.post(
        f"/api/v1/orders/{oid}/void",
        headers=_bearer(staff_token),
        json={"reason": "test"},
    )
    assert void.status_code == 403


def test_void_bill_pre_send_admin_no_stock_changes(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    void = client.post(
        f"/api/v1/orders/{oid}/void",
        headers=_bearer(admin_token),
        json={"reason": "test"},
    )
    assert void.status_code == 200
    body = void.json()
    assert body["status"] == "voided"
    assert body["voided_at"] is not None
    assert body["void_reason"] == "test"
    # No movements at all.
    assert session.exec(select(StockMovement)).all() == []


def test_void_bill_after_send_admin_reverses_all_stock(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id, qty=2)
    client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    void = client.post(
        f"/api/v1/orders/{oid}/void",
        headers=_bearer(admin_token),
        json={"reason": "wrong"},
    )
    assert void.status_code == 200
    stocks = {s.ingredient_id: s.quantity for s in session.exec(select(StockLevel)).all()}
    assert Decimal("1000") in stocks.values()
    assert Decimal("5000") in stocks.values()
    moves = session.exec(select(StockMovement)).all()
    assert any(m.type == MovementType.RETURN for m in moves)
    assert any(m.type == MovementType.SALE for m in moves)


def test_void_bill_already_voided_returns_409(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(
        f"/api/v1/orders/{oid}/void",
        headers=_bearer(admin_token),
        json={"reason": "x"},
    )
    second = client.post(
        f"/api/v1/orders/{oid}/void",
        headers=_bearer(admin_token),
        json={"reason": "y"},
    )
    assert second.status_code == 409
