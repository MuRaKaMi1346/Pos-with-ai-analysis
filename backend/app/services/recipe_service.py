"""Recipe (BOM) business logic."""

from collections.abc import Sequence

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Ingredient, Product, Recipe
from app.repositories import recipe_repo
from app.schemas.recipe import RecipeCreate


def get_or_404(session: Session, recipe_id: int) -> Recipe:
    recipe = recipe_repo.repository.get(session, recipe_id)
    if recipe is None:
        raise NotFoundError("recipe_not_found")
    return recipe


def list_for_product(session: Session, product_id: int) -> Sequence[Recipe]:
    return recipe_repo.list_for_product(session, product_id)


def create(session: Session, data: RecipeCreate) -> Recipe:
    if session.get(Product, data.product_id) is None:
        raise NotFoundError("product_not_found")
    if session.get(Ingredient, data.ingredient_id) is None:
        raise NotFoundError("ingredient_not_found")
    existing = recipe_repo.get_for_pair(
        session,
        product_id=data.product_id,
        ingredient_id=data.ingredient_id,
    )
    if existing is not None:
        raise ConflictError("recipe_already_exists")
    recipe = Recipe(**data.model_dump())
    return recipe_repo.repository.save(session, recipe)


def delete(session: Session, recipe_id: int) -> None:
    recipe = get_or_404(session, recipe_id)
    recipe_repo.repository.delete(session, recipe)
