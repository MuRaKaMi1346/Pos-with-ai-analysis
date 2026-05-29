"""ModifierGroup endpoints (admin CRUD)."""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import ModifierGroup, Role
from app.schemas.modifier import (
    ModifierGroupCreate,
    ModifierGroupRead,
    ModifierGroupUpdate,
)
from app.services import modifier_group_service

router = APIRouter(prefix="/modifier-groups", tags=["modifier-groups"])


@router.get("/", response_model=list[ModifierGroupRead])
def list_groups(
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> list[ModifierGroup]:
    return list(modifier_group_service.list_all(session))


@router.get("/{group_id}", response_model=ModifierGroupRead)
def get_group(
    group_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> ModifierGroup:
    return modifier_group_service.get_or_404(session, group_id)


@router.post(
    "/",
    response_model=ModifierGroupRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def create_group(
    data: ModifierGroupCreate,
    session: DBSessionDep,
) -> ModifierGroup:
    return modifier_group_service.create(session, data)


@router.patch(
    "/{group_id}",
    response_model=ModifierGroupRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def update_group(
    group_id: int,
    data: ModifierGroupUpdate,
    session: DBSessionDep,
) -> ModifierGroup:
    return modifier_group_service.update(session, group_id, data)


@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def delete_group(
    group_id: int,
    session: DBSessionDep,
) -> None:
    modifier_group_service.delete(session, group_id)
