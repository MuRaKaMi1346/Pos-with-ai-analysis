"""M4 discount engine tests.

Layered:
1. ``/discounts/`` master CRUD (admin gate + uniqueness + soft delete).
2. ``/discounts/applicable`` filtering (window + min_order_amount + scope).
3. Apply / remove on a live order — coded + ad-hoc, order-level + line-level,
   admin threshold rules.
4. Recompute hooks: discount_total flows into the totals breakdown; voided
   lines drop their discounts; PATCH /items recomputes order-level percent
   discounts against the new subtotal.
5. AuditLog rows written for every apply / remove.
"""

from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    AuditLog,
    Discount,
    DiscountScope,
    DiscountType,
    OrderDiscount,
    Product,
)
from app.utils.datetime import now_utc


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_order(client: TestClient, token: str, product_id: int, qty: int = 1) -> int:
    r = client.post(
        "/api/v1/orders/",
        headers=_bearer(token),
        json={"items": [{"product_id": product_id, "qty": qty}]},
    )
    r.raise_for_status()
    return int(r.json()["id"])


# ── Master CRUD ───────────────────────────────────────────────────────


def test_create_master_discount_admin(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/discounts/",
        headers=_bearer(admin_token),
        json={
            "code": "SUMMER10",
            "name": "Summer 10%",
            "scope": "order",
            "type": "percent",
            "value": "0.1000",
            "min_order_amount": "100.00",
            "requires_admin": False,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["code"] == "SUMMER10"
    assert body["scope"] == "order"
    assert body["is_active"] is True


def test_create_master_discount_staff_forbidden(client: TestClient, staff_token: str) -> None:
    response = client.post(
        "/api/v1/discounts/",
        headers=_bearer(staff_token),
        json={"code": "X", "name": "x", "scope": "order", "type": "amount", "value": "10"},
    )
    assert response.status_code == 403


def test_create_master_duplicate_code_returns_409(client: TestClient, admin_token: str) -> None:
    body = {
        "code": "DUPLICATE",
        "name": "Dup",
        "scope": "order",
        "type": "amount",
        "value": "5",
    }
    assert (
        client.post("/api/v1/discounts/", headers=_bearer(admin_token), json=body).status_code
        == 201
    )
    second = client.post("/api/v1/discounts/", headers=_bearer(admin_token), json=body)
    assert second.status_code == 409


def test_create_percent_over_one_returns_422(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/discounts/",
        headers=_bearer(admin_token),
        json={
            "name": "Bad",
            "scope": "order",
            "type": "percent",
            "value": "1.5",
        },
    )
    assert response.status_code == 422


def test_deactivate_is_soft(client: TestClient, admin_token: str) -> None:
    create = client.post(
        "/api/v1/discounts/",
        headers=_bearer(admin_token),
        json={"code": "TEMP", "name": "t", "scope": "order", "type": "amount", "value": "10"},
    )
    did = create.json()["id"]
    delete = client.delete(f"/api/v1/discounts/{did}", headers=_bearer(admin_token))
    assert delete.status_code == 200
    assert delete.json()["is_active"] is False
    # Still retrievable:
    assert client.get(f"/api/v1/discounts/{did}", headers=_bearer(admin_token)).status_code == 200


# ── /applicable ───────────────────────────────────────────────────────


def test_applicable_filters_by_window_and_min_order(
    client: TestClient, admin_token: str, session: Session
) -> None:
    now = now_utc()
    # Active + meets min
    session.add(
        Discount(
            code="A",
            name="A",
            scope=DiscountScope.ORDER,
            type=DiscountType.AMOUNT,
            value=Decimal("10"),
            min_order_amount=Decimal("100"),
        )
    )
    # Window expired
    session.add(
        Discount(
            code="EXP",
            name="exp",
            scope=DiscountScope.ORDER,
            type=DiscountType.AMOUNT,
            value=Decimal("10"),
            ends_at=now - timedelta(days=1),
        )
    )
    # Inactive
    session.add(
        Discount(
            code="OFF",
            name="off",
            scope=DiscountScope.ORDER,
            type=DiscountType.AMOUNT,
            value=Decimal("10"),
            is_active=False,
        )
    )
    session.commit()
    response = client.get(
        "/api/v1/discounts/applicable?subtotal=150&scope=order",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    codes = {d["code"] for d in response.json()}
    assert "A" in codes
    assert "EXP" not in codes
    assert "OFF" not in codes


def test_applicable_min_order_amount_excludes(
    client: TestClient, admin_token: str, session: Session
) -> None:
    session.add(
        Discount(
            code="BIG",
            name="big",
            scope=DiscountScope.ORDER,
            type=DiscountType.AMOUNT,
            value=Decimal("50"),
            min_order_amount=Decimal("500"),
        )
    )
    session.commit()
    response = client.get(
        "/api/v1/discounts/applicable?subtotal=100",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    assert all(d["code"] != "BIG" for d in response.json())


# ── Apply order-level ────────────────────────────────────────────────


def test_apply_order_discount_coded_percent(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    # Master 10% discount
    session.add(
        Discount(
            code="TEN",
            name="10% off",
            scope=DiscountScope.ORDER,
            type=DiscountType.PERCENT,
            value=Decimal("0.10"),
        )
    )
    session.commit()
    oid = _create_order(client, admin_token, product_latte.id, qty=2)  # subtotal 130
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"code": "TEN"},
    )
    assert apply.status_code == 201
    body = apply.json()
    assert len(body["discounts"]) == 1
    assert Decimal(body["discounts"][0]["amount_off"]) == Decimal("13.00")
    assert Decimal(body["discount_total"]) == Decimal("13.00")
    assert Decimal(body["total"]) == Decimal("117.00")  # 130 - 13


def test_apply_order_discount_adhoc_with_reason(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={
            "name": "Manager comp",
            "type": "amount",
            "value": "30",
            "reason": "regular customer",
        },
    )
    assert apply.status_code == 201
    body = apply.json()
    assert body["discounts"][0]["discount_id"] is None
    assert body["discounts"][0]["reason"] == "regular customer"
    assert Decimal(body["total"]) == Decimal("100.00")  # 130 - 30


def test_apply_adhoc_missing_reason_returns_422(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "x", "type": "amount", "value": "5"},
    )
    assert apply.status_code == 422


def test_apply_unknown_code_returns_404(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"code": "MISSING"},
    )
    assert apply.status_code == 404


# ── Admin threshold ──────────────────────────────────────────────────


def test_staff_blocked_when_discount_above_pct_threshold(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, staff_token, product_latte.id, qty=2)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(staff_token),
        json={
            "name": "Big",
            "type": "percent",
            "value": "0.50",  # 50% — over 20% threshold
            "reason": "test",
        },
    )
    assert apply.status_code == 403
    assert "discount_exceeds_pct_threshold" in apply.json()["message"]


def test_staff_blocked_when_discount_above_amount_threshold(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, staff_token, product_latte.id, qty=5)  # subtotal 325
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(staff_token),
        json={
            "name": "Big",
            "type": "amount",
            "value": "150",  # over 100 baht threshold
            "reason": "test",
        },
    )
    assert apply.status_code == 403
    assert "amount_threshold" in apply.json()["message"]


def test_admin_can_apply_above_threshold(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={
            "name": "Comp",
            "type": "percent",
            "value": "0.50",
            "reason": "vip",
        },
    )
    assert apply.status_code == 201


def test_master_requires_admin_blocks_staff(
    client: TestClient,
    staff_token: str,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    session.add(
        Discount(
            code="VIPONLY",
            name="VIP",
            scope=DiscountScope.ORDER,
            type=DiscountType.AMOUNT,
            value=Decimal("5"),  # under threshold — gate is requires_admin
            requires_admin=True,
        )
    )
    session.commit()
    oid = _create_order(client, staff_token, product_latte.id)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(staff_token),
        json={"code": "VIPONLY"},
    )
    assert apply.status_code == 403


# ── Line-level discount + master cap ─────────────────────────────────


def test_apply_item_discount(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    apply = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/discounts",
        headers=_bearer(admin_token),
        json={
            "name": "BOGO half",
            "type": "amount",
            "value": "32.50",  # half of 65
            "reason": "promo",
        },
    )
    assert apply.status_code == 201
    body = apply.json()
    assert Decimal(body["items"][0]["discounts"][0]["amount_off"]) == Decimal("32.50")
    assert Decimal(body["discount_total"]) == Decimal("32.50")
    assert Decimal(body["total"]) == Decimal("97.50")


def test_master_max_discount_amount_caps_amount_off(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    """20% off but capped at ฿20 — applied to a ฿130 bill should cap at ฿20."""
    session.add(
        Discount(
            code="CAP",
            name="Capped 20%",
            scope=DiscountScope.ORDER,
            type=DiscountType.PERCENT,
            value=Decimal("0.20"),  # would compute 26
            max_discount_amount=Decimal("20.00"),
        )
    )
    session.commit()
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"code": "CAP"},
    )
    assert apply.status_code == 201
    body = apply.json()
    assert Decimal(body["discounts"][0]["amount_off"]) == Decimal("20.00")
    assert Decimal(body["total"]) == Decimal("110.00")


# ── Remove ───────────────────────────────────────────────────────────


def test_remove_order_discount_by_self(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "x", "type": "amount", "value": "10", "reason": "test"},
    )
    od_id = apply.json()["discounts"][0]["id"]
    remove = client.delete(
        f"/api/v1/orders/{oid}/discounts/{od_id}",
        headers=_bearer(admin_token),
    )
    assert remove.status_code == 200
    body = remove.json()
    assert body["discounts"] == []
    assert Decimal(body["discount_total"]) == Decimal("0.00")


def test_staff_cannot_remove_other_users_discount(
    client: TestClient,
    admin_token: str,
    staff_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id)
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "x", "type": "amount", "value": "5", "reason": "test"},
    )
    od_id = apply.json()["discounts"][0]["id"]
    remove = client.delete(
        f"/api/v1/orders/{oid}/discounts/{od_id}",
        headers=_bearer(staff_token),
    )
    assert remove.status_code == 403


# ── Recompute hooks ──────────────────────────────────────────────────


def test_patch_items_recomputes_order_percent_discount(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)  # 130
    client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "10%", "type": "percent", "value": "0.10", "reason": "promo"},
    )
    # PATCH down to qty=1 → subtotal=65, 10% = 6.50
    patch = client.patch(
        f"/api/v1/orders/{oid}/items",
        headers=_bearer(admin_token),
        json={"items": [{"product_id": product_latte.id, "qty": 1}]},
    )
    assert patch.status_code == 200
    body = patch.json()
    assert Decimal(body["subtotal"]) == Decimal("65.00")
    assert Decimal(body["discount_total"]) == Decimal("6.50")
    assert Decimal(body["total"]) == Decimal("58.50")


def test_void_line_drops_its_line_discount_from_total(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id, qty=2)
    detail = client.get(f"/api/v1/orders/{oid}", headers=_bearer(admin_token)).json()
    item_id = detail["items"][0]["id"]
    client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/discounts",
        headers=_bearer(admin_token),
        json={"name": "promo", "type": "amount", "value": "20", "reason": "test"},
    )
    void = client.post(
        f"/api/v1/orders/{oid}/items/{item_id}/void",
        headers=_bearer(admin_token),
        json={"reason": "customer cancelled"},
    )
    assert void.status_code == 200
    body = void.json()
    # subtotal of live lines = 0; discount_total drops out of the recompute.
    assert Decimal(body["subtotal"]) == Decimal("0.00")
    assert Decimal(body["discount_total"]) == Decimal("0.00")
    # Snapshot row still on the line for audit.
    assert len(body["items"][0]["discounts"]) == 1


# ── Audit log ─────────────────────────────────────────────────────────


def test_apply_writes_audit_log(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id)
    client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "comp", "type": "amount", "value": "5", "reason": "test"},
    )
    rows = session.exec(select(AuditLog).where(AuditLog.action == "discount.apply.order")).all()
    assert len(rows) == 1
    payload = rows[0].payload_json or ""
    assert '"name": "comp"' in payload
    assert rows[0].entity_id == oid


def test_paid_order_cannot_take_discount(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    stocked_pantry: None,
    session: Session,
) -> None:
    """Direct DB mutation to PAID — apply must return 409."""
    _ = stocked_pantry
    oid = _create_order(client, admin_token, product_latte.id)
    from app.models import Order, OrderStatus

    order = session.get(Order, oid)
    assert order is not None
    order.status = OrderStatus.PAID
    session.add(order)
    session.commit()
    apply = client.post(
        f"/api/v1/orders/{oid}/discounts",
        headers=_bearer(admin_token),
        json={"name": "x", "type": "amount", "value": "1", "reason": "t"},
    )
    assert apply.status_code == 409
    # Sanity: no OrderDiscount row created.
    assert session.exec(select(OrderDiscount).where(OrderDiscount.order_id == oid)).all() == []
