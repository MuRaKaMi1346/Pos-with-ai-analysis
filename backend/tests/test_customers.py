"""M7 — customers + loyalty (earn on pay, redeem → next-bill discount)."""

from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import AuditLog, Customer, DiscountType, OrderDiscount, Product


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_customer(
    client: TestClient,
    token: str,
    *,
    name: str = "Alice",
    phone: str | None = None,
) -> dict[str, object]:
    body: dict[str, object] = {"name": name}
    if phone is not None:
        body["phone"] = phone
    r = client.post("/api/v1/customers/", headers=_bearer(token), json=body)
    r.raise_for_status()
    return r.json()


def _seed_customer(
    session: Session,
    *,
    name: str = "Seed",
    points: int = 0,
    phone: str | None = None,
    is_active: bool = True,
) -> Customer:
    """Insert a customer straight through the shared session (skips the API)."""
    customer = Customer(
        code=f"CSEED{uuid4().hex[:6]}",
        name=name,
        loyalty_points=points,
        phone=phone,
        is_active=is_active,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


# ── CRUD ──────────────────────────────────────────────────────────────


def test_create_customer_assigns_code_and_zero_balance(
    client: TestClient, staff_token: str
) -> None:
    body = _create_customer(client, staff_token, name="Alice", phone="0810000001")
    assert body["code"].startswith("C")
    assert body["code"][1:].isdigit()
    assert body["loyalty_points"] == 0
    assert Decimal(body["total_spend"]) == Decimal("0.00")
    assert body["total_visits"] == 0
    assert body["is_active"] is True


def test_create_duplicate_phone_returns_409(client: TestClient, staff_token: str) -> None:
    _create_customer(client, staff_token, name="Alice", phone="0820000001")
    dup = client.post(
        "/api/v1/customers/",
        headers=_bearer(staff_token),
        json={"name": "Bob", "phone": "0820000001"},
    )
    assert dup.status_code == 409
    assert "customer_phone_exists" in dup.json()["message"]


def test_search_by_name_and_phone(client: TestClient, staff_token: str) -> None:
    _create_customer(client, staff_token, name="Alice", phone="0830000001")
    _create_customer(client, staff_token, name="Bob", phone="0830000002")

    by_name = client.get("/api/v1/customers/?q=Ali", headers=_bearer(staff_token))
    assert by_name.status_code == 200
    names = {c["name"] for c in by_name.json()}
    assert names == {"Alice"}

    by_phone = client.get("/api/v1/customers/?q=0000002", headers=_bearer(staff_token))
    assert {c["name"] for c in by_phone.json()} == {"Bob"}


def test_get_missing_customer_returns_404(client: TestClient, staff_token: str) -> None:
    r = client.get("/api/v1/customers/9999", headers=_bearer(staff_token))
    assert r.status_code == 404


def test_update_customer_and_phone_clash(client: TestClient, staff_token: str) -> None:
    alice = _create_customer(client, staff_token, name="Alice", phone="0840000001")
    _create_customer(client, staff_token, name="Bob", phone="0840000002")

    ok = client.patch(
        f"/api/v1/customers/{alice['id']}",
        headers=_bearer(staff_token),
        json={"name": "Alicia"},
    )
    assert ok.status_code == 200
    assert ok.json()["name"] == "Alicia"

    clash = client.patch(
        f"/api/v1/customers/{alice['id']}",
        headers=_bearer(staff_token),
        json={"phone": "0840000002"},
    )
    assert clash.status_code == 409


def test_soft_delete_is_admin_only(client: TestClient, staff_token: str, admin_token: str) -> None:
    alice = _create_customer(client, staff_token, name="Alice", phone="0850000001")
    cid = alice["id"]

    forbidden = client.delete(f"/api/v1/customers/{cid}", headers=_bearer(staff_token))
    assert forbidden.status_code == 403

    deleted = client.delete(f"/api/v1/customers/{cid}", headers=_bearer(admin_token))
    assert deleted.status_code == 200
    assert deleted.json()["is_active"] is False

    # Default search hides inactive; include_inactive surfaces it.
    active = client.get("/api/v1/customers/", headers=_bearer(staff_token)).json()
    assert all(c["id"] != cid for c in active)
    everyone = client.get(
        "/api/v1/customers/?include_inactive=true", headers=_bearer(staff_token)
    ).json()
    assert any(c["id"] == cid for c in everyone)


# ── Loyalty: redeem ─────────────────────────────────────────────────────


def test_redeem_points_parks_pending_baht(
    client: TestClient, staff_token: str, session: Session
) -> None:
    customer = _seed_customer(session, points=500, name="Vip")
    r = client.post(
        f"/api/v1/customers/{customer.id}/loyalty/redeem",
        headers=_bearer(staff_token),
        json={"points": 100},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["points_redeemed"] == 100
    assert Decimal(body["discount_amount"]) == Decimal("10.00")  # 100 * 0.10
    assert body["points_remaining"] == 400
    assert Decimal(body["pending_redemption_baht"]) == Decimal("10.00")

    refreshed = session.get(Customer, customer.id)
    assert refreshed is not None
    assert refreshed.loyalty_points == 400
    assert refreshed.pending_redemption_baht == Decimal("10.00")
    # Redemption is audited.
    audits = session.exec(select(AuditLog).where(AuditLog.action == "loyalty.redeem")).all()
    assert len(audits) == 1


def test_redeem_more_than_balance_returns_400(
    client: TestClient, staff_token: str, session: Session
) -> None:
    customer = _seed_customer(session, points=50, name="Low")
    r = client.post(
        f"/api/v1/customers/{customer.id}/loyalty/redeem",
        headers=_bearer(staff_token),
        json={"points": 100},
    )
    assert r.status_code == 400
    assert "insufficient_points" in r.json()["message"]


def test_redeem_inactive_customer_returns_409(
    client: TestClient, staff_token: str, session: Session
) -> None:
    customer = _seed_customer(session, points=500, name="Gone", is_active=False)
    r = client.post(
        f"/api/v1/customers/{customer.id}/loyalty/redeem",
        headers=_bearer(staff_token),
        json={"points": 100},
    )
    assert r.status_code == 409
    assert "customer_inactive" in r.json()["message"]


# ── Loyalty: earn on pay ────────────────────────────────────────────────


def test_paying_a_bill_earns_points_and_rolls_aggregates(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    customer = _create_customer(client, staff_token, name="Earner", phone="0860000001")
    cid = customer["id"]

    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}], "customer_id": cid},
    )
    assert create.status_code == 201
    assert create.json()["customer_id"] == cid
    oid = create.json()["id"]

    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(staff_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 200

    detail = client.get(f"/api/v1/customers/{cid}", headers=_bearer(staff_token)).json()
    assert detail["loyalty_points"] == 3  # floor(65 / 20)
    assert detail["total_visits"] == 1
    assert Decimal(detail["total_spend"]) == Decimal("65.00")
    assert detail["last_visit_at"] is not None


def test_walkin_pay_does_not_touch_loyalty(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert create.json()["customer_id"] is None
    oid = create.json()["id"]
    pay = client.post(
        f"/api/v1/orders/{oid}/pay",
        headers=_bearer(staff_token),
        json={"tenders": [{"method": "cash", "amount": "65.00"}]},
    )
    assert pay.status_code == 200  # no crash on the null-customer path


# ── Loyalty: redemption applied to the next bill ───────────────────────


def test_pending_redemption_applies_to_next_order(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    customer = _seed_customer(session, points=500, name="Redeemer", phone="0870000001")
    cid = customer.id

    redeem = client.post(
        f"/api/v1/customers/{cid}/loyalty/redeem",
        headers=_bearer(staff_token),
        json={"points": 100},  # → ฿10 pending
    )
    redeem.raise_for_status()

    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}], "customer_id": cid},
    )
    assert create.status_code == 201
    body = create.json()
    # Latte 65 - 10 redemption = 55 grand total (VAT-inclusive, no service).
    assert Decimal(body["discount_total"]) == Decimal("10.00")
    assert Decimal(body["total"]) == Decimal("55.00")
    assert len(body["discounts"]) == 1

    # A POINTS order-discount snapshot was written…
    ods = session.exec(select(OrderDiscount).where(OrderDiscount.order_id == body["id"])).all()
    assert len(ods) == 1
    assert ods[0].type == DiscountType.POINTS
    assert ods[0].amount_off == Decimal("10.00")
    # …and the pending baht was consumed.
    refreshed = session.get(Customer, cid)
    assert refreshed is not None
    assert refreshed.pending_redemption_baht == Decimal("0.00")


def test_create_order_with_unknown_customer_returns_404(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
) -> None:
    r = client.post(
        "/api/v1/orders/",
        headers=_bearer(staff_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}], "customer_id": 9999},
    )
    assert r.status_code == 404
    assert "customer_not_found" in r.json()["message"]


# ── Order history ───────────────────────────────────────────────────────


def test_customer_order_history(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    customer = _create_customer(client, staff_token, name="History", phone="0880000001")
    cid = customer["id"]
    for _i in range(2):
        client.post(
            "/api/v1/orders/",
            headers=_bearer(staff_token),
            json={
                "items": [{"product_id": product_latte.id, "qty": 1}],
                "customer_id": cid,
            },
        ).raise_for_status()

    history = client.get(f"/api/v1/customers/{cid}/orders", headers=_bearer(staff_token))
    assert history.status_code == 200
    rows = history.json()
    assert len(rows) == 2
    assert all(o["customer_id"] == cid for o in rows)
