"""Shared pytest fixtures.

Uses an in-memory SQLite shared across the engine via ``StaticPool`` so the
TestClient request and the test body see the same data. Override the
``get_session`` dependency so the app uses the test session.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import app.db.base as _models_base  # populates SQLModel.metadata
from app.db.session import get_session
from app.main import app

_ = _models_base


@pytest.fixture(name="engine")
def engine_fixture() -> Generator[object, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine: object) -> Generator[Session, None, None]:
    with Session(engine) as session:  # type: ignore[arg-type]
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    def _override_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = _override_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
