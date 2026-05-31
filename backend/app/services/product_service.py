"""Product business logic — thin layer over product_repo."""

from collections import defaultdict
from collections.abc import Sequence

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Category, Modifier, ModifierGroup, Product
from app.repositories import product_repo
from app.schemas.modifier import ModifierGroupRead, ModifierRead
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.datetime import now_utc


def list_categories(session: Session) -> Sequence[Category]:
    """All categories, name-sorted — powers the POS category rail (M12)."""
    return product_repo.list_categories(session)


def list_modifier_groups(session: Session, product_id: int) -> list[ModifierGroupRead]:
    """A product's active modifiers grouped for the POS picker (M13).

    Only modifiers actually linked to the product are returned, grouped by their
    ``ModifierGroup`` (which carries the radio/checkbox + required UX), ordered by
    ``sort_order`` then name. Groups with no active linked modifier are omitted.
    """
    product = product_repo.get_with_modifiers(session, product_id)
    if product is None:
        raise NotFoundError(f"product_not_found:{product_id}")

    groups: dict[int, ModifierGroup] = {}
    members: dict[int, list[Modifier]] = defaultdict(list)
    for mod in product.modifiers:
        if not mod.is_active or mod.group.id is None:
            continue
        groups[mod.group.id] = mod.group
        members[mod.group.id].append(mod)

    result: list[ModifierGroupRead] = []
    for group in sorted(groups.values(), key=lambda g: (g.sort_order, g.name)):
        assert group.id is not None
        mods = sorted(members[group.id], key=lambda m: (m.sort_order, m.name))
        result.append(
            ModifierGroupRead(
                id=group.id,
                name=group.name,
                min_select=group.min_select,
                max_select=group.max_select,
                is_required=group.is_required,
                sort_order=group.sort_order,
                modifiers=[ModifierRead.model_validate(m) for m in mods],
            )
        )
    return result


def get_or_404(session: Session, product_id: int) -> Product:
    product = product_repo.repository.get(session, product_id)
    if product is None:
        raise NotFoundError("product_not_found")
    return product


def lookup_by_code(session: Session, code: str) -> Product:
    """Resolve a scanned SKU / barcode to an active product (M15); 404 if none."""
    product = product_repo.get_by_code(session, code)
    if product is None:
        raise NotFoundError(f"product_code_not_found:{code}")
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
