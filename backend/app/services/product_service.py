"""Product business logic — thin layer over product_repo."""

from collections.abc import Sequence

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Category, Product
from app.repositories import product_repo
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.datetime import now_utc


def list_categories(session: Session) -> Sequence[Category]:
    """All categories, name-sorted — powers the POS category rail (M12)."""
    return product_repo.list_categories(session)


def get_or_404(session: Session, product_id: int) -> Product:
    product = product_repo.repository.get(session, product_id)
    if product is None:
        raise NotFoundError("product_not_found")
    return product


def list_filtered(
    session: Session,
    *,
    category_id: int | None = None,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Product]:
    return product_repo.list_filtered(
        session,
        category_id=category_id,
        active_only=active_only,
        offset=offset,
        limit=limit,
    )


def create(session: Session, data: ProductCreate) -> Product:
    if product_repo.get_by_name(session, data.name) is not None:
        raise ConflictError("product_name_exists")
    product = Product(**data.model_dump())
    return product_repo.repository.save(session, product)


def update(session: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_or_404(session, product_id)
    updates = data.model_dump(exclude_unset=True)
    if (
        "name" in updates
        and updates["name"] != product.name
        and product_repo.get_by_name(session, updates["name"]) is not None
    ):
        raise ConflictError("product_name_exists")
    for key, value in updates.items():
        setattr(product, key, value)
    product.updated_at = now_utc()
    return product_repo.repository.save(session, product)


def deactivate(session: Session, product_id: int) -> Product:
    """Soft delete: never hard-delete because historical orders reference this."""
    product = get_or_404(session, product_id)
    product.is_active = False
    product.updated_at = now_utc()
    return product_repo.repository.save(session, product)
