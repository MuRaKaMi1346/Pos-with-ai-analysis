"""Recipe (BOM) business logic.

M2: a Recipe belongs to either a ``Product`` or a ``Modifier`` (the SQL
CHECK constraint is the ultimate guard; we validate up-front here for a
clean 4xx instead of an opaque IntegrityError).
"""

from collections.abc import Sequence

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models import Ingredient, Modifier, Product, Recipe
from app.repositories import recipe_repo
from app.schemas.recipe import RecipeCreate


def get_or_404(session: Session, recipe_id: int) -> Recipe:
    recipe = recipe_repo.repository.get(session, recipe_id)
    if recipe is None:
        raise NotFoundError("recipe_not_found")
    return recipe


def list_for_product(session: Session, product_id: int) -> Sequence[Recipe]:
    return recipe_repo.list_for_product(session, product_id)


def list_for_modifier(session: Session, modifier_id: int) -> Sequence[Recipe]:
    return recipe_repo.list_for_modifier(session, modifier_id)


def create(session: Session, data: RecipeCreate) -> Recipe:
    """Create a BOM line for either a product or a modifier.

    The Pydantic schema already rejects "neither / both", but defend in depth.
    """
    if (data.product_id is None) == (data.modifier_id is None):
        raise ValidationError("exactly_one_of_product_id_or_modifier_id")

    if session.get(Ingredient, data.ingredient_id) is None:
        raise NotFoundError("ingredient_not_found")

    if data.product_id is not None:
        if session.get(Product, data.product_id) is None:
            raise NotFoundError("product_not_found")
        if (
            recipe_repo.get_for_pair(
                session,
                product_id=data.product_id,
                ingredient_id=data.ingredient_id,
            )
            is not None
        ):
            raise ConflictError("recipe_already_exists")
    else:
        assert data.modifier_id is not None
        if session.get(Modifier, data.modifier_id) is None:
            raise NotFoundError("modifier_not_found")
        if (
            recipe_repo.get_for_modifier_pair(
                session,
                modifier_id=data.modifier_id,
                ingredient_id=data.ingredient_id,
            )
            is not None
        ):
            raise ConflictError("recipe_already_exists")

    recipe = Recipe(**data.model_dump())
    return recipe_repo.repository.save(session, recipe)


def delete(session: Session, recipe_id: int) -> None:
    recipe = get_or_404(session, recipe_id)
    recipe_repo.repository.delete(session, recipe)
