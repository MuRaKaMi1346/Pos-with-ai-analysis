"""Tests for /api/v1/inventory."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Ingredient, MovementType, StockLevel, StockMovement


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_receive_stock_increments_level_and_records_movement(
    client: TestClient,
    admin_token: str,
    ingredient_beans: Ingredient,
    session: Session,
) -> None:
    response = client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(admin_token),
        json={"ingredient_id": ingredient_beans.id, "qty": "500", "ref": "po:1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert Decimal(body["quantity"]) == Decimal("500")

    movements = session.exec(
        select(StockMovement).where(StockMovement.ingredient_id == ingredient_beans.id)
    ).all()
    assert len(movements) == 1
    assert movements[0].type == MovementType.RECEIVE
    assert movements[0].qty == Decimal("500")
    assert movements[0].ref == "po:1"


def test_receive_stock_accumulates(
    client: TestClient,
    admin_token: str,
    ingredient_beans: Ingredient,
    session: Session,
) -> None:
    client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(admin_token),
        json={"ingredient_id": ingredient_beans.id, "qty": "100"},
    )
    client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(admin_token),
        json={"ingredient_id": ingredient_beans.id, "qty": "250"},
    )
    stock = session.exec(
        select(StockLevel).where(StockLevel.ingredient_id == ingredient_beans.id)
    ).first()
    assert stock is not None
    assert stock.quantity == Decimal("350")


def test_receive_stock_unknown_ingredient_returns_404(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(admin_token),
        json={"ingredient_id": 9999, "qty": "10"},
    )
    assert response.status_code == 404


def test_receive_stock_rejects_zero_qty(
    client: TestClient, admin_token: str, ingredient_beans: Ingredient
) -> None:
    response = client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(admin_token),
        json={"ingredient_id": ingredient_beans.id, "qty": "0"},
    )
    assert response.status_code == 422


def test_receive_stock_as_staff_returns_403(
    client: TestClient, staff_token: str, ingredient_beans: Ingredient
) -> None:
    response = client.post(
        "/api/v1/inventory/receive",
        headers=_bearer(staff_token),
        json={"ingredient_id": ingredient_beans.id, "qty": "10"},
    )
    assert response.status_code == 403


def test_list_stock(
    client: TestClient,
    admin_token: str,
    stocked_pantry: None,
) -> None:
    _ = stocked_pantry
    response = client.get("/api/v1/inventory/stock", headers=_bearer(admin_token))
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) >= 2


def test_movements_admin_only(client: TestClient, staff_token: str) -> None:
    response = client.get("/api/v1/inventory/movements", headers=_bearer(staff_token))
    assert response.status_code == 403
