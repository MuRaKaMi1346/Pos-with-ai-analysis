"""Audit log read endpoint (M10). Admin only."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import DBSessionDep, require_role
from app.models import AuditLog, Role, User
from app.schemas.audit import AuditLogRead
from app.services import audit_service

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("/", response_model=list[AuditLogRead])
def list_audit_logs(
    session: DBSessionDep,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[AuditLog]:
    """Most-recent-first audit trail with optional filters."""
    return list(
        audit_service.list_logs(
            session,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            offset=offset,
            limit=limit,
        )
    )
