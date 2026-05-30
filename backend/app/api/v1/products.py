"""Products endpoints."""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import Product, Role
from app.schemas.modifier import ModifierGroupRead
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=list[ProductRead])
def list_products(
    session: DBSessionDep,
    _current: CurrentUserDep,
    category_id: int | None = None,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 100,
) -> list[Product]:
    return list(
        product_service.list_filtered(
            session,
            category_id=category_id,
            active_only=active_only,
            offset=offset,
            limit=limit,
        )
    )


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Product:
    return product_service.get_or_404(session, product_id)


@router.get("/{product_id}/modifiers", response_model=list[ModifierGroupRead])
def list_product_modifiers(
    product_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> list[ModifierGroupRead]:
    """The product's modifier groups (linked + active) for the POS picker (M13)."""
    return product_service.list_modifier_groups(session, product_id)


@router.post(
    "/",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def create_product(data: ProductCreate, session: DBSessionDep) -> Product:
    return product_service.create(session, data)


@router.patch(
    "/{product_id}",
    response_model=ProductRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def update_product(product_id: int, data: ProductUpdate, session: DBSessionDep) -> Product:
    return product_service.update(session, product_id, data)


@router.delete(
    "/{product_id}",
    response_model=ProductRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def deactivate_product(product_id: int, session: DBSessionDep) -> Product:
    """Soft delete — sets is_active=False so historical orders stay valid."""
    return product_service.deactivate(session, product_id)
