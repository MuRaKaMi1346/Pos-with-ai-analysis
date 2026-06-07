"""Products endpoints."""

from fastapi import APIRouter, Depends, UploadFile, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, SettingsDep, require_role
from app.models import Product, Role
from app.schemas.modifier import ModifierGroupRead
from app.schemas.product import ImageUploadRead, ProductCreate, ProductRead, ProductUpdate
from app.services import product_service, upload_service

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


@router.get("/lookup", response_model=ProductRead)
def lookup_product(
    code: str,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Product:
    """Resolve a scanned SKU / barcode to an active product (M15). 404 if unknown.

    Declared before ``/{product_id}`` so ``lookup`` isn't parsed as an id.
    """
    return product_service.lookup_by_code(session, code)


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


@router.post(
    "/image",
    response_model=ImageUploadRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
async def upload_product_image(file: UploadFile, settings: SettingsDep) -> ImageUploadRead:
    """Upload a menu picture from the admin's device; returns the stored URL.

    The caller then sends this ``url`` as ``image`` on product create/update, so
    the upload and the product record stay decoupled — re-using or replacing an
    image is just a string change.
    """
    url = await upload_service.save_product_image(file, settings)
    return ImageUploadRead(url=url)


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
