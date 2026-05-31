"""Tests for /api/v1/products."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Modifier, ModifierGroup, Product


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_product_as_admin(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "Espresso", "price": "55.00", "cost": "10.00"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Espresso"
    assert body["price"] == "55.00"
    assert body["is_active"] is True


def test_create_product_as_staff_returns_403(client: TestClient, staff_token: str) -> None:
    response = client.post(
        "/api/v1/products/",
        headers=_bearer(staff_token),
        json={"name": "Mocha", "price": "70.00"},
    )
    assert response.status_code == 403


def test_create_duplicate_product_name_returns_409(client: TestClient, admin_token: str) -> None:
    payload = {"name": "Latte", "price": "65.00"}
    first = client.post("/api/v1/products/", headers=_bearer(admin_token), json=payload)
    assert first.status_code == 201
    dup = client.post("/api/v1/products/", headers=_bearer(admin_token), json=payload)
    assert dup.status_code == 409
    assert dup.json()["code"] == "conflict"


def test_list_products_excludes_inactive_by_default(client: TestClient, admin_token: str) -> None:
    client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "Cappuccino", "price": "65.00"},
    )
    inactive = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "RetiredMenu", "price": "55.00"},
    )
    pid = inactive.json()["id"]
    client.delete(f"/api/v1/products/{pid}", headers=_bearer(admin_token))

    active_list = client.get("/api/v1/products/", headers=_bearer(admin_token))
    assert active_list.status_code == 200
    names = [p["name"] for p in active_list.json()]
    assert "Cappuccino" in names
    assert "RetiredMenu" not in names

    all_list = client.get("/api/v1/products/?active_only=false", headers=_bearer(admin_token))
    all_names = [p["name"] for p in all_list.json()]
    assert "RetiredMenu" in all_names


def test_get_product_404(client: TestClient, admin_token: str) -> None:
    response = client.get("/api/v1/products/9999", headers=_bearer(admin_token))
    assert response.status_code == 404


def test_patch_product_updates_fields(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "Americano", "price": "55.00"},
    ).json()
    response = client.patch(
        f"/api/v1/products/{created['id']}",
        headers=_bearer(admin_token),
        json={"price": "60.00"},
    )
    assert response.status_code == 200
    assert response.json()["price"] == "60.00"


def test_delete_product_is_soft(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "OldMenu", "price": "50.00"},
    ).json()
    response = client.delete(f"/api/v1/products/{created['id']}", headers=_bearer(admin_token))
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    # Still retrievable by id
    assert (
        client.get(f"/api/v1/products/{created['id']}", headers=_bearer(admin_token)).status_code
        == 200
    )


def test_list_products_requires_login(client: TestClient) -> None:
    response = client.get("/api/v1/products/")
    assert response.status_code == 401


# ── M13: per-product modifiers (POS picker) ──────────────────────────


def test_product_read_exposes_has_modifiers(
    client: TestClient,
    staff_token: str,
    session: Session,
    product_latte: Product,
    modifier_extra_shot: Modifier,
) -> None:
    first = client.get(f"/api/v1/products/{product_latte.id}", headers=_bearer(staff_token))
    assert first.status_code == 200
    assert first.json()["has_modifiers"] is False

    product_latte.modifiers.append(modifier_extra_shot)
    session.add(product_latte)
    session.commit()

    again = client.get(f"/api/v1/products/{product_latte.id}", headers=_bearer(staff_token))
    assert again.json()["has_modifiers"] is True


def test_list_product_modifiers_returns_linked_groups(
    client: TestClient,
    staff_token: str,
    session: Session,
    product_latte: Product,
    modifier_group_extras: ModifierGroup,
    modifier_extra_shot: Modifier,
) -> None:
    _ = modifier_group_extras
    product_latte.modifiers.append(modifier_extra_shot)
    session.add(product_latte)
    session.commit()

    response = client.get(
        f"/api/v1/products/{product_latte.id}/modifiers", headers=_bearer(staff_token)
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    group = body[0]
    assert group["name"] == "extras"
    assert group["max_select"] == 2
    assert group["is_required"] is False
    assert [m["name"] for m in group["modifiers"]] == ["Extra shot"]
    assert group["modifiers"][0]["price_delta"] == "10.00"


def test_list_product_modifiers_excludes_inactive(
    client: TestClient,
    staff_token: str,
    session: Session,
    product_latte: Product,
    modifier_extra_shot: Modifier,
) -> None:
    modifier_extra_shot.is_active = False
    product_latte.modifiers.append(modifier_extra_shot)
    session.add_all([product_latte, modifier_extra_shot])
    session.commit()

    response = client.get(
        f"/api/v1/products/{product_latte.id}/modifiers", headers=_bearer(staff_token)
    )
    assert response.status_code == 200
    assert response.json() == []


def test_list_product_modifiers_unknown_product_404(client: TestClient, staff_token: str) -> None:
    response = client.get("/api/v1/products/9999/modifiers", headers=_bearer(staff_token))
    assert response.status_code == 404


def test_list_product_modifiers_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/products/1/modifiers").status_code == 401


# ── M15: SKU / barcode lookup (scan-to-add) ──────────────────────────


def test_lookup_product_by_sku_or_barcode(
    client: TestClient,
    staff_token: str,
    session: Session,
    product_latte: Product,
) -> None:
    product_latte.sku = "LAT-001"
    product_latte.barcode = "8851234567890"
    session.add(product_latte)
    session.commit()

    by_barcode = client.get(
        "/api/v1/products/lookup", params={"code": "8851234567890"}, headers=_bearer(staff_token)
    )
    assert by_barcode.status_code == 200
    assert by_barcode.json()["id"] == product_latte.id
    assert by_barcode.json()["barcode"] == "8851234567890"

    by_sku = client.get(
        "/api/v1/products/lookup", params={"code": "LAT-001"}, headers=_bearer(staff_token)
    )
    assert by_sku.status_code == 200
    assert by_sku.json()["sku"] == "LAT-001"


def test_lookup_unknown_code_returns_404(
    client: TestClient, staff_token: str, product_latte: Product
) -> None:
    _ = product_latte
    response = client.get(
        "/api/v1/products/lookup", params={"code": "NOPE"}, headers=_bearer(staff_token)
    )
    assert response.status_code == 404


def test_lookup_excludes_inactive_products(
    client: TestClient,
    staff_token: str,
    session: Session,
    product_latte: Product,
) -> None:
    product_latte.barcode = "111"
    product_latte.is_active = False
    session.add(product_latte)
    session.commit()
    response = client.get(
        "/api/v1/products/lookup", params={"code": "111"}, headers=_bearer(staff_token)
    )
    assert response.status_code == 404


def test_lookup_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/products/lookup", params={"code": "x"}).status_code == 401


def test_create_product_round_trips_sku_barcode(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "Scan Me", "price": "20.00", "sku": "SM-1", "barcode": "999"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["sku"] == "SM-1"
    assert body["barcode"] == "999"
