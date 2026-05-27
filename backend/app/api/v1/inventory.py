"""Inventory endpoints (stock listing + receive + movements log)."""

from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import MovementType, Role, StockLevel, StockMovement
from app.schemas.inventory import (
    ReceiveStockRequest,
    StockLevelRead,
    StockMovementRead,
)
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/stock", response_model=list[StockLevelRead])
def list_stock(
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> list[StockLevel]:
    return list(inventory_service.list_all_stock(session))


@router.post(
    "/receive",
    response_model=StockLevelRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def receive_stock(
    data: ReceiveStockRequest,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> StockLevel:
    return inventory_service.receive_stock(
        session,
        ingredient_id=data.ingredient_id,
        qty=data.qty,
        user_id=current.id,
        ref=data.ref,
        note=data.note,
    )


@router.get(
    "/movements",
    response_model=list[StockMovementRead],
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def list_movements(
    session: DBSessionDep,
    ingredient_id: int | None = None,
    movement_type: MovementType | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[StockMovement]:
    return list(
        inventory_service.list_movements(
            session,
            ingredient_id=ingredient_id,
            movement_type=movement_type,
            offset=offset,
            limit=limit,
        )
    )
