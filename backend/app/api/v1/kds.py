"""KDS (kitchen display) endpoints (M9).

Staff-visible: the kitchen rail lists open tickets and bumps/recalls them.
"""

from fastapi import APIRouter

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.models import KdsStatus, Station
from app.schemas.kds import KdsTicketRead
from app.services import kds_service

router = APIRouter(prefix="/kds", tags=["kds"])


@router.get("/tickets", response_model=list[KdsTicketRead])
def list_tickets(
    session: DBSessionDep,
    _current: CurrentUserDep,
    station: Station | None = None,
    status: KdsStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[KdsTicketRead]:
    return kds_service.list_tickets(
        session, station=station, status=status, offset=offset, limit=limit
    )


@router.post("/tickets/{ticket_id}/bump", response_model=KdsTicketRead)
def bump_ticket(
    ticket_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> KdsTicketRead:
    """Mark a ticket DONE — its station finished the items."""
    return kds_service.bump(session, ticket_id)


@router.post("/tickets/{ticket_id}/recall", response_model=KdsTicketRead)
def recall_ticket(
    ticket_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> KdsTicketRead:
    """Pull a bumped ticket back to IN_PROGRESS."""
    return kds_service.recall(session, ticket_id)
