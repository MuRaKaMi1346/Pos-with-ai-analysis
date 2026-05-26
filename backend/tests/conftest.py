"""Shared pytest fixtures.

Test env vars are set BEFORE importing ``app`` so ``Settings`` (lru_cache'd) picks
them up: ``APP_ENV=test`` skips the lifespan ``init_db`` seed; a high
``RATE_LIMIT_LOGIN`` keeps slowapi from interfering; a deterministic
``APP_SECRET_KEY`` makes JWTs reproducible.
"""

import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("APP_SECRET_KEY", "test-secret-do-not-use-in-production-okay-32+")
os.environ.setdefault("RATE_LIMIT_LOGIN", "10000/minute")
os.environ.setdefault("REFRESH_COOKIE_SECURE", "false")

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import app.db.base as _models_base  # populates SQLModel.metadata
from app.core.security import hash_password
from app.db.session import get_session
from app.main import app
from app.models import Role, User

_ = _models_base


@pytest.fixture(name="engine")
def engine_fixture() -> Generator[Engine, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine: Engine) -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    def _override_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_session] = _override_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# ── User fixtures ────────────────────────────────────────────────────


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session) -> User:
    user = User(
        username="admin",
        password_hash=hash_password("AdminPass123"),
        role=Role.ADMIN,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="staff_user")
def staff_user_fixture(session: Session) -> User:
    user = User(
        username="staff",
        password_hash=hash_password("StaffPass123"),
        role=Role.STAFF,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _login(client: TestClient, username: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": password},
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


@pytest.fixture(name="admin_token")
def admin_token_fixture(client: TestClient, admin_user: User) -> str:
    _ = admin_user
    return _login(client, "admin", "AdminPass123")


@pytest.fixture(name="staff_token")
def staff_token_fixture(client: TestClient, staff_user: User) -> str:
    _ = staff_user
    return _login(client, "staff", "StaffPass123")
