"""M5 — multi-tender pay + idempotency."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import IdempotencyKey, Order, OrderStatus, Payment, Product


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


# ── Happy paths ───────────────────────────────────────────────────────


def test_pay_cash_exact_flips_to_paid(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)  # total 65
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 200
    body = pay.json()
    assert body["status"] == "paid"
    assert body["closed_at"] is not None
    assert Decimal(body["paid_total"]) == Decimal("65.00")
    assert Decimal(body["change_due"]) == Decimal("0.00")
    assert len(body["payments"]) == 1
    assert body["payments"][0]["method"] == "cash"
    # Persisted on the order:
    order = session.get(Order, oid)
    assert order is not None
    assert order.status == OrderStatus.PAID


def test_pay_cash_overpayment_records_change(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)  # total 65
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00", "tendered_amount": "100.00"}]},
    )
    assert pay.status_code == 200
    body = pay.json()
    assert Decimal(body["change_due"]) == Decimal("35.00")
    assert Decimal(body["payments"][0]["tendered_amount"]) == Decimal("100.00")


def test_pay_split_cash_and_card(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id, qty=2)  # total 130
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={
            "tenders": [
                {"method": "card", "amount": "100.00", "reference": "1234"},
                {"method": "cash", "amount": "30.00", "tendered_amount": "50.00"},
            ]
        },
    )
    assert pay.status_code == 200
    body = pay.json()
    assert body["status"] == "paid"
    assert Decimal(body["paid_total"]) == Decimal("130.00")
    assert Decimal(body["change_due"]) == Decimal("20.00")
    methods = {p["method"] for p in body["payments"]}
    assert methods == {"cash", "card"}


# ── Reference required for CARD / QR ─────────────────────────────────


def test_pay_card_without_reference_returns_400(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "card", "amount": "65.00"}]},
    )
    assert pay.status_code == 400
    assert "reference_required" in pay.json()["message"]


def test_pay_qr_without_reference_returns_400(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "qr_promptpay", "amount": "65.00"}]},
    )
    assert pay.status_code == 400


# ── Amount validation ────────────────────────────────────────────────


def test_pay_underpayment_returns_400(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "50.00"}]},
    )
    assert pay.status_code == 400
    assert "amount_sum_must_equal_total" in pay.json()["message"]


def test_pay_overpayment_in_amount_field_returns_400(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    """Cash overpay must come via ``tendered_amount`` — ``amount`` overshoot
    means a different bug (customer card got charged extra)."""
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "100.00"}]},
    )
    assert pay.status_code == 400


def test_pay_tendered_lt_amount_returns_422(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    """Pydantic-level: cash with tendered < amount is impossible at the API edge."""
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00", "tendered_amount": "50.00"}]},
    )
    assert pay.status_code == 422


# ── State guards ──────────────────────────────────────────────────────


def test_pay_already_paid_returns_409(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    first = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert second.status_code == 409
    assert "cannot_pay_status" in second.json()["message"]


def test_pay_hold_requires_resume_first(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    client.post(f"/api/v1/orders/{oid}/hold", headers=_bearer(admin_token))
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 409


def test_pay_voided_returns_409(
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
        json={"reason": "test"},
    )
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 409


def test_pay_before_send_to_kitchen_ok(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    """M5 default: pay is independent of send-to-kitchen — counter pickup flow."""
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(admin_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 200


# ── Idempotency ───────────────────────────────────────────────────────


def test_idempotency_replays_same_key_same_body(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    payload = {"items": [{"product_id": product_latte.id, "qty": 1}]}
    headers = {**_bearer(admin_token), "Idempotency-Key": "test-key-1"}
    first = client.post("/api/v1/orders/", headers=headers, json=payload)
    assert first.status_code == 201
    oid = first.json()["id"]

    # Second request with same key + body → replay; no new order persisted.
    second = client.post("/api/v1/orders/", headers=headers, json=payload)
    assert second.status_code == 201
    assert second.json()["id"] == oid
    # Persisted IdempotencyKey row visible.
    rows = session.exec(select(IdempotencyKey)).all()
    assert len(rows) == 1


def test_idempotency_same_key_different_body_returns_409(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    headers = {**_bearer(admin_token), "Idempotency-Key": "test-key-2"}
    first = client.post(
        "/api/v1/orders/",
        headers=headers,
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert first.status_code == 201
    second = client.post(
        "/api/v1/orders/",
        headers=headers,
        json={"items": [{"product_id": product_latte.id, "qty": 2}]},
    )
    assert second.status_code == 409
    assert "idempotency_key_mismatch" in second.json()["message"]


def test_idempotency_on_pay_replays(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create(client, admin_token, product_latte.id)
    headers = {**_bearer(admin_token), "Idempotency-Key": "pay-key-1"}
    body = {"tenders": [{"method": "cash", "amount": "65.00"}]}
    first = client.post(f"/api/v1/orders/{oid}/pay", headers=headers, json=body)
    assert first.status_code == 200
    payments_before = len(session.exec(select(Payment)).all())

    # Retry → same response, no duplicate Payment rows.
    second = client.post(f"/api/v1/orders/{oid}/pay", headers=headers, json=body)
    assert second.status_code == 200
    payments_after = len(session.exec(select(Payment)).all())
    assert payments_after == payments_before


def test_idempotency_scoped_to_user(
    client: TestClient,
    admin_token: str,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    """Same key by a different user must NOT replay."""
    _ = stocked_pantry
    payload = {"items": [{"product_id": product_latte.id, "qty": 1}]}
    admin_headers = {**_bearer(admin_token), "Idempotency-Key": "shared-key"}
    staff_headers = {**_bearer(staff_token), "Idempotency-Key": "shared-key"}

    a = client.post("/api/v1/orders/", headers=admin_headers, json=payload)
    s = client.post("/api/v1/orders/", headers=staff_headers, json=payload)
    assert a.status_code == s.status_code == 201
    assert a.json()["id"] != s.json()["id"]


def test_idempotency_prune_drops_old_rows(session: Session) -> None:
    """Direct service call — ops cron path."""
    from app.services import idempotency
    from app.utils.datetime import now_utc

    # Insert a row aged 30 days ago.
    old = IdempotencyKey(
        key="ancient",
        endpoint="create_order",
        user_id=1,
        request_hash="x",
        response_status=201,
        response_json="{}",
        created_at=now_utc().replace(tzinfo=None).replace(year=now_utc().year - 1),
    )
    session.add(old)
    session.commit()
    purged = idempotency.prune_older_than(session, hours=24)
    assert purged >= 1
