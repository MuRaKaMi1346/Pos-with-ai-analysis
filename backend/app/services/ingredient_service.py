"""Ingredient business logic.

Creating an Ingredient automatically creates its StockLevel row (quantity=0) so
later receive/sale operations always have a row to update.
"""

from collections.abc import Sequence
from decimal import Decimal

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Ingredient, StockLevel
from app.repositories import ingredient_repo, inventory_repo
from app.schemas.ingredient import IngredientCreate, IngredientUpdate
from app.utils.datetime import now_utc


def get_or_404(session: Session, ingredient_id: int) -> Ingredient:
    ingredient = ingredient_repo.repository.get(session, ingredient_id)
    if ingredient is None:
        raise NotFoundError("ingredient_not_found")
    return ingredient


def list_filtered(
    session: Session,
    *,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 200,
) -> Sequence[Ingredient]:
    return ingredient_repo.list_filtered(
        session, active_only=active_only, offset=offset, limit=limit
    )


def create(session: Session, data: IngredientCreate) -> Ingredient:
    if ingredient_repo.get_by_name(session, data.name) is not None:
        raise ConflictError("ingredient_name_exists")

    ingredient = Ingredient(**data.model_dump())
    session.add(ingredient)
    session.flush()  # need ingredient.id for StockLevel FK
    assert ingredient.id is not None

    stock = StockLevel(ingredient_id=ingredient.id, quantity=Decimal("0"))
    session.add(stock)
    session.commit()
    session.refresh(ingredient)
    return ingredient


def update(session: Session, ingredient_id: int, data: IngredientUpdate) -> Ingredient:
    ingredient = get_or_404(session, ingredient_id)
    updates = data.model_dump(exclude_unset=True)
    if (
        "name" in updates
        and updates["name"] != ingredient.name
        and ingredient_repo.get_by_name(session, updates["name"]) is not None
    ):
        raise ConflictError("ingredient_name_exists")
    for key, value in updates.items():
        setattr(ingredient, key, value)
    ingredient.updated_at = now_utc()
    return ingredient_repo.repository.save(session, ingredient)


def deactivate(session: Session, ingredient_id: int) -> Ingredient:
    ingredient = get_or_404(session, ingredient_id)
    ingredient.is_active = False
    ingredient.updated_at = now_utc()
    return ingredient_repo.repository.save(session, ingredient)


def get_with_stock(session: Session, ingredient_id: int) -> tuple[Ingredient, StockLevel | None]:
    ingredient = get_or_404(session, ingredient_id)
    stock = inventory_repo.get_stock(session, ingredient_id)
    return ingredient, stock
