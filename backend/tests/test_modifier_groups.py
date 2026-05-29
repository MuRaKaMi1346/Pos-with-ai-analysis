"""Tests for /api/v1/modifier-groups + Recipe XOR + order modifier-recipe deduction.

Covers M2's three concerns:
1. ModifierGroup CRUD (admin-only mutations).
2. Recipe.create accepts product_id XOR modifier_id (Pydantic + service +
   SQL CHECK each catch the wrong shapes).
3. order_service.create_order deducts modifier-recipe ingredients, in the
   same atomic transaction as product-recipe deductions.
"""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    Ingredient,
    Modifier,
    ModifierGroup,
    MovementType,
    Product,
    Recipe,
    StockLevel,
    StockMovement,
    Unit,
)


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── ModifierGroup CRUD ───────────────────────────────────────────────


def test_create_group_admin_can_seed_modifiers(
    client: TestClient,
    admin_token: str,
) -> None:
    response = client.post(
        "/api/v1/modifier-groups/",
        headers=_bearer(admin_token),
        json={
            "name": "Sweetness",
            "min_select": 1,
            "max_select": 1,
            "is_required": True,
            "sort_order": 10,
            "modifiers": [
                {"name": "Less sweet", "price_delta": "0.00", "sort_order": 0},
                {"name": "Regular", "price_delta": "0.00", "sort_order": 1},
                {"name": "More sweet", "price_delta": "5.00", "sort_order": 2},
            ],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Sweetness"
    assert body["is_required"] is True
    assert {m["name"] for m in body["modifiers"]} == {
        "Less sweet",
        "Regular",
        "More sweet",
    }


def test_create_group_duplicate_name_returns_409(
    client: TestClient,
    admin_token: str,
    modifier_group_extras: ModifierGroup,
) -> None:
    _ = modifier_group_extras
    response = client.post(
        "/api/v1/modifier-groups/",
        headers=_bearer(admin_token),
        json={"name": "extras"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "conflict"


def test_create_group_max_less_than_min_returns_400(
    client: TestClient,
    admin_token: str,
) -> None:
    response = client.post(
        "/api/v1/modifier-groups/",
        headers=_bearer(admin_token),
        json={"name": "Bad", "min_select": 3, "max_select": 1},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_group_staff_forbidden(
    client: TestClient,
    staff_token: str,
) -> None:
    response = client.post(
        "/api/v1/modifier-groups/",
        headers=_bearer(staff_token),
        json={"name": "Spice"},
    )
    assert response.status_code == 403


def test_update_group_patches_fields(
    client: TestClient,
    admin_token: str,
    modifier_group_extras: ModifierGroup,
) -> None:
    response = client.patch(
        f"/api/v1/modifier-groups/{modifier_group_extras.id}",
        headers=_bearer(admin_token),
        json={"is_required": True, "sort_order": 5},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_required"] is True
    assert body["sort_order"] == 5


def test_delete_group_with_modifiers_blocked(
    client: TestClient,
    admin_token: str,
    modifier_extra_shot: Modifier,
    modifier_group_extras: ModifierGroup,
) -> None:
    _ = modifier_extra_shot  # ensures one Modifier belongs to the group
    response = client.delete(
        f"/api/v1/modifier-groups/{modifier_group_extras.id}",
        headers=_bearer(admin_token),
    )
    assert response.status_code == 409
    assert "has_modifiers" in response.json()["message"]


def test_list_groups_visible_to_staff(
    client: TestClient,
    staff_token: str,
    modifier_group_extras: ModifierGroup,
) -> None:
    _ = modifier_group_extras
    response = client.get("/api/v1/modifier-groups/", headers=_bearer(staff_token))
    assert response.status_code == 200
    assert any(g["name"] == "extras" for g in response.json())


# ── Recipe.create XOR validation ─────────────────────────────────────


def test_recipe_create_for_modifier_succeeds(
    client: TestClient,
    admin_token: str,
    modifier_extra_shot: Modifier,
    ingredient_beans: Ingredient,
) -> None:
    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "modifier_id": modifier_extra_shot.id,
            "ingredient_id": ingredient_beans.id,
            "qty": "7.0000",
            "unit": "g",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["product_id"] is None
    assert body["modifier_id"] == modifier_extra_shot.id


def test_recipe_create_neither_id_returns_422(
    client: TestClient,
    admin_token: str,
    ingredient_beans: Ingredient,
) -> None:
    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "ingredient_id": ingredient_beans.id,
            "qty": "10.0000",
            "unit": "g",
        },
    )
    assert response.status_code == 422  # Pydantic XOR validator


def test_recipe_create_both_ids_returns_422(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    modifier_extra_shot: Modifier,
    ingredient_beans: Ingredient,
) -> None:
    response = client.post(
        "/api/v1/recipes/",
        headers=_bearer(admin_token),
        json={
            "product_id": product_latte.id,
            "modifier_id": modifier_extra_shot.id,
            "ingredient_id": ingredient_beans.id,
            "qty": "5.0000",
            "unit": "g",
        },
    )
    assert response.status_code == 422


# ── Order: modifier recipe deducts its own ingredients ───────────────


def test_send_with_modifier_recipe_deducts_modifier_ingredients(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    modifier_extra_shot: Modifier,
    stocked_pantry: None,
    ingredient_beans: Ingredient,
    session: Session,
) -> None:
    """Extra shot consumes 7 g beans on top of the latte's 18 g — at send-to-kitchen."""
    _ = stocked_pantry
    session.add(
        Recipe(
            modifier_id=modifier_extra_shot.id,
            ingredient_id=ingredient_beans.id,
            qty=Decimal("7.0000"),
            unit=Unit.GRAM,
        )
    )
    session.commit()

    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={
            "items": [
                {
                    "product_id": product_latte.id,
                    "qty": 1,
                    "modifier_ids": [modifier_extra_shot.id],
                }
            ]
        },
    )
    assert create.status_code == 201
    order_id = create.json()["id"]
    send = client.post(f"/api/v1/orders/{order_id}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 200

    beans_stock = session.exec(
        select(StockLevel).where(StockLevel.ingredient_id == ingredient_beans.id)
    ).one()
    assert beans_stock.quantity == Decimal("975")  # 1000 - (18 + 7)
    bean_moves = session.exec(
        select(StockMovement)
        .where(StockMovement.type == MovementType.SALE)
        .where(StockMovement.ingredient_id == ingredient_beans.id)
    ).all()
    assert len(bean_moves) == 1
    assert bean_moves[0].qty == Decimal("-25")


def test_send_with_modifier_recipe_low_stock_rolls_back(
    client: TestClient,
    admin_token: str,
    product_latte: Product,
    modifier_extra_shot: Modifier,
    stocked_pantry: None,
    ingredient_beans: Ingredient,
    session: Session,
) -> None:
    """Modifier recipe pushes total demand past stock — send-to-kitchen 409s."""
    _ = stocked_pantry
    session.add(
        Recipe(
            modifier_id=modifier_extra_shot.id,
            ingredient_id=ingredient_beans.id,
            qty=Decimal("2000.0000"),
            unit=Unit.GRAM,
        )
    )
    session.commit()

    create = client.post(
        "/api/v1/orders/",
        headers=_bearer(admin_token),
        json={
            "items": [
                {
                    "product_id": product_latte.id,
                    "qty": 1,
                    "modifier_ids": [modifier_extra_shot.id],
                }
            ]
        },
    )
    assert create.status_code == 201
    order_id = create.json()["id"]

    send = client.post(f"/api/v1/orders/{order_id}/send-to-kitchen", headers=_bearer(admin_token))
    assert send.status_code == 409
    assert "insufficient_stock" in send.json()["message"]

    beans_stock = session.exec(
        select(StockLevel).where(StockLevel.ingredient_id == ingredient_beans.id)
    ).one()
    assert beans_stock.quantity == Decimal("1000")
    assert session.exec(select(StockMovement)).all() == []
