"""M11 — receipt DTO + flag-gated 80mm PDF."""

from decimal import Decimal

from fastapi.testclient import TestClient

from app.models import Modifier, Product


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create(client: TestClient, token: str, items: list[dict[str, object]]) -> dict[str, object]:
    r = client.post("/api/v1/orders/", headers=_bearer(token), json={"items": items})
    r.raise_for_status()
    return r.json()


def _enable_pdf(client: TestClient, admin_token: str) -> None:
    client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"receipt_pdf_enabled": True}
    ).raise_for_status()


# ── DTO ──────────────────────────────────────────────────────────────


def test_receipt_dto_basic(client: TestClient, admin_token: str, product_latte: Product) -> None:
    order = _create(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    r = client.get(f"/api/v1/orders/{order['id']}/receipt", headers=_bearer(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["order_number"] == order["order_number"]
    assert body["status"] == "open"
    assert body["currency"] == "THB"
    assert body["footer"] is None
    assert len(body["lines"]) == 1
    assert body["lines"][0]["product_name"] == "Latte"
    assert body["lines"][0]["qty"] == 1
    assert Decimal(body["lines"][0]["line_total"]) == Decimal("65.00")
    assert Decimal(body["total"]) == Decimal("65.00")
    assert body["payments"] == []


def test_receipt_reflects_settings(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    client.patch(
        "/api/v1/settings/",
        headers=_bearer(admin_token),
        json={"store_name": "Brew Lab", "store_tax_id": "0105500001", "receipt_footer": "Thanks!"},
    ).raise_for_status()
    order = _create(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    body = client.get(f"/api/v1/orders/{order['id']}/receipt", headers=_bearer(admin_token)).json()
    assert body["store"]["name"] == "Brew Lab"
    assert body["store"]["tax_id"] == "0105500001"
    assert body["footer"] == "Thanks!"


def test_receipt_includes_payments(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    order = _create(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    client.post(
        f"/api/v1/orders/{order['id']}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00", "tendered_amount": "100.00"}]},
    ).raise_for_status()
    body = client.get(f"/api/v1/orders/{order['id']}/receipt", headers=_bearer(admin_token)).json()
    assert body["status"] == "paid"
    assert len(body["payments"]) == 1
    assert body["payments"][0]["method"] == "cash"
    assert Decimal(body["payments"][0]["amount"]) == Decimal("65.00")
    assert Decimal(body["change_due"]) == Decimal("35.00")


def test_receipt_modifiers_and_line_total(
    client: TestClient, admin_token: str, product_latte: Product, modifier_extra_shot: Modifier
) -> None:
    order = _create(
        client,
        admin_token,
        [{"product_id": product_latte.id, "qty": 1, "modifier_ids": [modifier_extra_shot.id]}],
    )
    body = client.get(f"/api/v1/orders/{order['id']}/receipt", headers=_bearer(admin_token)).json()
    line = body["lines"][0]
    assert [m["name"] for m in line["modifiers"]] == ["Extra shot"]
    assert Decimal(line["modifiers"][0]["price_delta"]) == Decimal("10.00")
    assert Decimal(line["line_total"]) == Decimal("75.00")  # (65 + 10) * 1


def test_receipt_excludes_voided_lines(
    client: TestClient, admin_token: str, product_latte: Product, stocked_pantry: None
) -> None:
    _ = stocked_pantry
    order = _create(
        client,
        admin_token,
        [{"product_id": product_latte.id, "qty": 1}, {"product_id": product_latte.id, "qty": 1}],
    )
    oid = order["id"]
    client.post(f"/api/v1/orders/{oid}/send-to-kitchen", headers=_bearer(admin_token))
    voided_item_id = order["items"][0]["id"]  # type: ignore[index]
    client.post(
        f"/api/v1/orders/{oid}/items/{voided_item_id}/void",
        headers=_bearer(admin_token),
        json={"reason": "spill"},
    ).raise_for_status()
    body = client.get(f"/api/v1/orders/{oid}/receipt", headers=_bearer(admin_token)).json()
    assert len(body["lines"]) == 1  # voided line omitted
    assert Decimal(body["total"]) == Decimal("65.00")


def test_receipt_unknown_order_404(client: TestClient, admin_token: str) -> None:
    r = client.get("/api/v1/orders/9999/receipt", headers=_bearer(admin_token))
    assert r.status_code == 404


# ── PDF (flag-gated) ─────────────────────────────────────────────────


def test_receipt_pdf_disabled_by_default_returns_404(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    order = _create(client, admin_token, [{"product_id": product_latte.id, "qty": 1}])
    r = client.get(f"/api/v1/orders/{order['id']}/receipt.pdf", headers=_bearer(admin_token))
    assert r.status_code == 404
    assert "receipt_pdf_disabled" in r.json()["message"]


def test_receipt_pdf_enabled_returns_pdf_bytes(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    _enable_pdf(client, admin_token)
    order = _create(
        client,
        admin_token,
        [{"product_id": product_latte.id, "qty": 2}],
    )
    client.post(
        f"/api/v1/orders/{order['id']}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "130.00"}]},
    ).raise_for_status()
    r = client.get(f"/api/v1/orders/{order['id']}/receipt.pdf", headers=_bearer(admin_token))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
    assert int(r.headers["content-length"]) > 0
