"""Ingredient endpoints."""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import Ingredient, Role
from app.schemas.ingredient import (
    IngredientCreate,
    IngredientRead,
    IngredientUpdate,
    IngredientWithStockRead,
)
from app.services import ingredient_service

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("/", response_model=list[IngredientRead])
def list_ingredients(
    session: DBSessionDep,
    _current: CurrentUserDep,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 200,
) -> list[Ingredient]:
    return list(
        ingredient_service.list_filtered(
            session, active_only=active_only, offset=offset, limit=limit
        )
    )


@router.get("/{ingredient_id}", response_model=IngredientWithStockRead)
def get_ingredient(
    ingredient_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> IngredientWithStockRead:
    ingredient, stock = ingredient_service.get_with_stock(session, ingredient_id)
    return IngredientWithStockRead(
        id=ingredient.id,  # type: ignore[arg-type]
        name=ingredient.name,
        unit=ingredient.unit,
        shelf_life_days=ingredient.shelf_life_days,
        is_active=ingredient.is_active,
        created_at=ingredient.created_at,
        updated_at=ingredient.updated_at,
        quantity=stock.quantity if stock else None,
        reorder_point=stock.reorder_point if stock else None,
    )


@router.post(
    "/",
    response_model=IngredientRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def create_ingredient(data: IngredientCreate, session: DBSessionDep) -> Ingredient:
    return ingredient_service.create(session, data)


@router.patch(
    "/{ingredient_id}",
    response_model=IngredientRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def update_ingredient(
    ingredient_id: int, data: IngredientUpdate, session: DBSessionDep
) -> Ingredient:
    return ingredient_service.update(session, ingredient_id, data)


@router.delete(
    "/{ingredient_id}",
    response_model=IngredientRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def deactivate_ingredient(ingredient_id: int, session: DBSessionDep) -> Ingredient:
    return ingredient_service.deactivate(session, ingredient_id)
