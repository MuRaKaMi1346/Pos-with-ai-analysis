"""M12 — category list endpoint (powers the POS rail)."""

from fastapi.testclient import TestClient

from app.models import Category


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_list_categories(client: TestClient, staff_token: str, category_coffee: Category) -> None:
    _ = category_coffee
    r = client.get("/api/v1/categories/", headers=_bearer(staff_token))
    assert r.status_code == 200
    body = r.json()
    coffee = next(c for c in body if c["name"] == "Coffee")
    assert isinstance(coffee["id"], int)
    assert coffee["default_station"] == "bar"  # model default


def test_list_categories_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/categories/").status_code == 401
