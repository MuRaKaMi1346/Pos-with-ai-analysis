"""Store settings endpoints (M10). Read by any staff; write is admin-only."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import Role, User
from app.schemas.setting import SettingsRead, SettingsUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingsRead)
def read_settings(session: DBSessionDep, _current: CurrentUserDep) -> SettingsRead:
    """Effective store settings (defaults overlaid with admin overrides)."""
    return SettingsRead.model_validate(settings_service.get_effective(session))


@router.patch("/", response_model=SettingsRead)
def update_settings(
    data: SettingsUpdate,
    session: DBSessionDep,
    admin: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> SettingsRead:
    """Patch one or more settings. Admin only; writes an audit-log entry."""
    return SettingsRead.model_validate(settings_service.update(session, data, actor=admin))
