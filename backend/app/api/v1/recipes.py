"""Recipe (BOM) endpoints."""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import Recipe, Role
from app.schemas.recipe import RecipeCreate, RecipeRead
from app.services import recipe_service

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("/", response_model=list[RecipeRead])
def list_recipes(
    product_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> list[Recipe]:
    """List the BOM lines for one product. ``product_id`` query param is required."""
    return list(recipe_service.list_for_product(session, product_id))


@router.post(
    "/",
    response_model=RecipeRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def create_recipe(data: RecipeCreate, session: DBSessionDep) -> Recipe:
    return recipe_service.create(session, data)


@router.delete(
    "/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def delete_recipe(recipe_id: int, session: DBSessionDep) -> None:
    recipe_service.delete(session, recipe_id)
