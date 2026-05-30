"""M8 — cashier shifts + cash drawer + end-of-shift reconciliation."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlmodel import Session

from app.models import Order, Product


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _open_shift(client: TestClient, token: str, opening_float: str = "0.00") -> dict[str, object]:
    r = client.post(
        "/api/v1/shifts/open",
        headers=_bearer(token),
        json={"opening_float": opening_float},
    )
    r.raise_for_status()
    return r.json()


def _create_order(
    client: TestClient, token: str, product_id: int, qty: int = 1
) -> dict[str, object]:
    r = client.post(
        "/api/v1/orders/",
        headers=_bearer(token),
        json={"items": [{"product_id": product_id, "qty": qty}]},
    )
    r.raise_for_status()
    return r.json()


def _pay_cash(client: TestClient, token: str, oid: int, amount: str) -> None:
    r = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(token),
        json={"tenders": [{"method": "cash", "amount": amount}]},
    )
    r.raise_for_status()


def _movement(
    client: TestClient, token: str, movement_type: str, amount: str, reason: str = "x"
) -> Response:
    return client.post(
        "/api/v1/cash-drawer/movements",
        headers=_bearer(token),
        json={"type": movement_type, "amount": amount, "reason": reason},
    )


def _close(client: TestClient, token: str, counted: str, note: str | None = None) -> Response:
    return client.post(
        "/api/v1/shifts/close",
        headers=_bearer(token),
        json={"closing_cash_counted": counted, "closing_note": note},
    )


# ── Open / current / close lifecycle ─────────────────────────────────


def test_open_shift(client: TestClient, staff_token: str) -> None:
    body = _open_shift(client, staff_token, "1500.00")
    assert body["is_open"] is True
    assert Decimal(body["opening_float"]) == Decimal("1500.00")
    assert body["closed_at"] is None
    assert body["expected_cash"] is None


def test_open_twice_returns_409(client: TestClient, staff_token: str) -> None:
    _open_shift(client, staff_token, "0.00")
    second = client.post(
        "/api/v1/shifts/open", headers=_bearer(staff_token), json={"opening_float": "0.00"}
    )
    assert second.status_code == 409
    assert "shift_already_open" in second.json()["message"]


def test_current_shift_then_404_after_close(client: TestClient, staff_token: str) -> None:
    none_yet = client.get("/api/v1/shifts/current", headers=_bearer(staff_token))
    assert none_yet.status_code == 404

    _open_shift(client, staff_token, "100.00")
    current = client.get("/api/v1/shifts/current", headers=_bearer(staff_token))
    assert current.status_code == 200
    assert current.json()["is_open"] is True

    assert _close(client, staff_token, "100.00").status_code == 200
    after = client.get("/api/v1/shifts/current", headers=_bearer(staff_token))
    assert after.status_code == 404


def test_close_no_open_shift_returns_409(client: TestClient, staff_token: str) -> None:
    r = _close(client, staff_token, "0.00")
    assert r.status_code == 409
    assert "no_open_shift" in r.json()["message"]


# ── Cash drawer ──────────────────────────────────────────────────────


def test_cash_movement_requires_open_shift(client: TestClient, staff_token: str) -> None:
    r = _movement(client, staff_token, "pay_in", "100.00")
    assert r.status_code == 409
    assert "no_open_shift" in r.json()["message"]


def test_cash_movements_recorded_and_listed(client: TestClient, staff_token: str) -> None:
    _open_shift(client, staff_token, "0.00")
    assert _movement(client, staff_token, "pay_in", "200.00", "float top-up").status_code == 201
    assert _movement(client, staff_token, "pay_out", "50.00", "supplier").status_code == 201

    listing = client.get("/api/v1/cash-drawer/movements", headers=_bearer(staff_token))
    assert listing.status_code == 200
    assert len(listing.json()) == 2
    assert {m["type"] for m in listing.json()} == {"pay_in", "pay_out"}


# ── Reconciliation ───────────────────────────────────────────────────


def test_close_reconciles_cash_zero_variance(
    client: TestClient, admin_token: str, product_latte: Product, session: Session
) -> None:
    shift = _open_shift(client, admin_token, "1000.00")
    order = _create_order(client, admin_token, product_latte.id)  # total 65
    _pay_cash(client, admin_token, int(order["id"]), "65.00")
    _movement(client, admin_token, "pay_in", "200.00")
    _movement(client, admin_token, "pay_out", "50.00")

    # expected = 1000 float + 65 cash sale + 200 pay-in - 50 pay-out = 1215
    close = _close(client, admin_token, "1215.00", "balanced")
    assert close.status_code == 200
    body = close.json()
    assert Decimal(body["expected_cash"]) == Decimal("1215.00")
    assert Decimal(body["cash_variance"]) == Decimal("0.00")
    assert body["is_open"] is False

    # The bill was stamped with the shift (persisted + exposed on the API).
    persisted = session.get(Order, int(order["id"]))
    assert persisted is not None
    assert persisted.cashier_shift_id == shift["id"]
    detail = client.get(f"/api/v1/orders/{order['id']}", headers=_bearer(admin_token)).json()
    assert detail["cashier_shift_id"] == shift["id"]


def test_close_reports_negative_variance_when_short(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    _open_shift(client, admin_token, "1000.00")
    order = _create_order(client, admin_token, product_latte.id)
    _pay_cash(client, admin_token, int(order["id"]), "65.00")

    # expected 1065, counted 1060 → -5.00
    close = _close(client, admin_token, "1060.00")
    assert close.status_code == 200
    assert Decimal(close.json()["expected_cash"]) == Decimal("1065.00")
    assert Decimal(close.json()["cash_variance"]) == Decimal("-5.00")


def test_refund_reduces_expected_cash(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    _open_shift(client, admin_token, "500.00")
    order = _create_order(client, admin_token, product_latte.id)
    item_id = order["items"][0]["id"]  # type: ignore[index]
    _pay_cash(client, admin_token, int(order["id"]), "65.00")

    refund = client.post(
        "/api/v1/refunds/",
        headers=_bearer(admin_token),
        json={
            "order_id": order["id"],
            "items": [{"order_item_id": item_id, "qty": 1, "restock": False}],
            "reason": "test",
        },
    )
    assert refund.status_code == 201
    assert refund.json()["cashier_shift_id"] is not None

    # expected = 500 float + 65 sale - 65 refund = 500
    close = _close(client, admin_token, "500.00")
    assert close.status_code == 200
    assert Decimal(close.json()["expected_cash"]) == Decimal("500.00")
    assert Decimal(close.json()["cash_variance"]) == Decimal("0.00")


# ── Admin listing + create gate ──────────────────────────────────────


def test_list_shifts_admin_only(client: TestClient, staff_token: str, admin_token: str) -> None:
    _open_shift(client, staff_token, "0.00")
    forbidden = client.get("/api/v1/shifts/", headers=_bearer(staff_token))
    assert forbidden.status_code == 403
    ok = client.get("/api/v1/shifts/", headers=_bearer(admin_token))
    assert ok.status_code == 200
    assert len(ok.json()) >= 1


def test_require_open_shift_gate(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "pos_require_open_shift", True)

    blocked = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert blocked.status_code == 409
    assert "no_open_shift" in blocked.json()["message"]

    _open_shift(client, staff_token, "0.00")
    ok = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert ok.status_code == 201
