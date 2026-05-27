"""Tests for /api/v1/recipes."""

from fastapi.testclient import TestClient

from app.models import Ingredient, Product


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_recipe(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    ingredient_beans: Ingredient,
) -> None:
    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "product_id": 9999,
            "ingredient_id": ingredient_beans.id,
            "qty": "5.0",
            "unit": "g",
        },
    )
    assert response.status_code == 404

    # product_latte already has beans recipe — duplicate should 409
    dup = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "product_id": product_latte.id,
            "ingredient_id": ingredient_beans.id,
            "qty": "5.0",
            "unit": "g",
        },
    )
    assert dup.status_code == 409
    assert dup.json()["code"] == "conflict"


def test_create_recipe_for_new_pair(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    ingredient_milk: Ingredient,
    session,  # type: ignore[no-untyped-def]
) -> None:
    # Add a new ingredient + new recipe line on existing product
    new_ing = Ingredient(name="Sugar", unit="g")  # type: ignore[arg-type]
    session.add(new_ing)
    session.commit()
    session.refresh(new_ing)
    _ = ingredient_milk

    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "product_id": product_latte.id,
            "ingredient_id": new_ing.id,
            "qty": "2.5",
            "unit": "g",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["product_id"] == product_latte.id
    assert body["ingredient_id"] == new_ing.id


def test_list_recipes_for_product(
    client: TestClient, admin_token: str, product_latte: Product
) -> None:
    response = client.get(
        f"/api/v1/recipes/?product_id={product_latte.id}",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 2  # beans + milk per fixture


def test_delete_recipe(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
) -> None:
    listed = client.get(
        f"/api/v1/recipes/?product_id={product_latte.id}",
        headers=_bearer(admin_token),
    ).json()
    target = listed[0]
    response = client.delete(f"/api/v1/recipes/{target['id']}", headers=_bearer(admin_token))
    assert response.status_code == 204


def test_create_recipe_as_staff_returns_403(
    client: TestClient,
    staff_token: str,
    product_latte: Product,
    ingredient_beans: Ingredient,
) -> None:
    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(staff_token),
        json={
            "product_id": product_latte.id,
            "ingredient_id": ingredient_beans.id,
            "qty": "1.0",
            "unit": "g",
        },
    )
    assert response.status_code == 403
