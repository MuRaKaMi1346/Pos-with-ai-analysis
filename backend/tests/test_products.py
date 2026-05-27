"""Tests for /api/v1/products."""

from fastapi.testclient import TestClient


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
