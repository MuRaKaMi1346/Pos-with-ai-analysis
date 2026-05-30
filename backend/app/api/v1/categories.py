"""Category endpoints (M12) — read-only list for the POS category rail."""

from fastapi import APIRouter

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.models import Category
from app.schemas.product import CategoryRead
from app.services import product_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryRead])
def list_categories(session: DBSessionDep, _current: CurrentUserDep) -> list[Category]:
    return list(product_service.list_categories(session))
