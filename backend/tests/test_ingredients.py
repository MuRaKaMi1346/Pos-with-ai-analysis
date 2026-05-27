"""Tests for /api/v1/ingredients (including auto StockLevel creation)."""

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import StockLevel


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_ingredient_initialises_stock_level(
    client: TestClient, admin_token: str, session: Session
) -> None:
    response = client.post(
        "/api/v1/ingredients/",
        headers=_bearer(admin_token),
        json={"name": "Vanilla Syrup", "unit": "ml"},
    )
    assert response.status_code == 201
    body = response.json()
    ingredient_id = body["id"]

    stock = session.exec(
        select(StockLevel).where(StockLevel.ingredient_id == ingredient_id)
    ).first()
    assert stock is not None
    assert stock.quantity == 0


def test_create_ingredient_duplicate_name_returns_409(client: TestClient, admin_token: str) -> None:
    payload = {"name": "Espresso Beans", "unit": "g"}
    first = client.post("/api/v1/ingredients/", headers=_bearer(admin_token), json=payload)
    assert first.status_code == 201
    dup = client.post("/api/v1/ingredients/", headers=_bearer(admin_token), json=payload)
    assert dup.status_code == 409


def test_get_ingredient_includes_stock(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/ingredients/",
        headers=_bearer(admin_token),
        json={"name": "Caramel", "unit": "ml"},
    ).json()
    response = client.get(f"/api/v1/ingredients/{created['id']}", headers=_bearer(admin_token))
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Caramel"
    assert body["quantity"] == "0.0000"


def test_patch_ingredient(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/ingredients/",
        headers=_bearer(admin_token),
        json={"name": "Honey", "unit": "ml"},
    ).json()
    response = client.patch(
        f"/api/v1/ingredients/{created['id']}",
        headers=_bearer(admin_token),
        json={"shelf_life_days": 365},
    )
    assert response.status_code == 200
    assert response.json()["shelf_life_days"] == 365


def test_delete_ingredient_is_soft(client: TestClient, admin_token: str) -> None:
    created = client.post(
        "/api/v1/ingredients/",
        headers=_bearer(admin_token),
        json={"name": "Old Stock", "unit": "g"},
    ).json()
    response = client.delete(f"/api/v1/ingredients/{created['id']}", headers=_bearer(admin_token))
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_create_ingredient_as_staff_returns_403(client: TestClient, staff_token: str) -> None:
    response = client.post(
        "/api/v1/ingredients/",
        headers=_bearer(staff_token),
        json={"name": "Sugar", "unit": "g"},
    )
    assert response.status_code == 403
