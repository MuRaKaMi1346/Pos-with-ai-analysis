"""KDS ticket repository (M9)."""

from collections.abc import Sequence

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, select

from app.models import KdsStatus, KdsTicket, Station
from app.repositories.base import BaseRepository

repository = BaseRepository(KdsTicket)


def list_filtered(
    session: Session,
    *,
    station: Station | None = None,
    status: KdsStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[KdsTicket]:
    """Tickets oldest-first (FIFO for the kitchen rail), optional filters."""
    printed_col: ColumnElement[object] = KdsTicket.printed_at  # type: ignore[assignment]
    statement = select(KdsTicket).order_by(printed_col)
    if station is not None:
        statement = statement.where(KdsTicket.station == station)
    if status is not None:
        statement = statement.where(KdsTicket.status == status)
    return session.exec(statement.offset(offset).limit(limit)).all()
