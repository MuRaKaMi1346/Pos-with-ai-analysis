"""SQLModel engine + session generator."""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import get_settings

_settings = get_settings()

# SQLite needs check_same_thread=False because FastAPI may call the session
# from a different thread per request. Other DBs ignore connect_args.
_connect_args: dict[str, object] = (
    {"check_same_thread": False} if _settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(
    _settings.database_url,
    echo=_settings.sql_echo,
    connect_args=_connect_args,
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency: open a session per request, rollback on error, always close."""
    with Session(engine) as session:
        yield session
