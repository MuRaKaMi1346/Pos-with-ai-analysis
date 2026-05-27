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
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

import app.db.base as _models_base  # populates SQLModel.metadata
from app.core.security import hash_password
from app.db.session import get_session
from app.main import app
from app.models import (
    Category,
    Ingredient,
    Modifier,
    Product,
    Recipe,
    Role,
    StockLevel,
    Unit,
    User,
)

_ = _models_base


# ── Engine / Session / Client ────────────────────────────────────────


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


# ── Domain fixtures (categories / ingredients / products / modifiers) ─


@pytest.fixture(name="category_coffee")
def category_coffee_fixture(session: Session) -> Category:
    cat = Category(name="Coffee")
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat


@pytest.fixture(name="ingredient_beans")
def ingredient_beans_fixture(session: Session) -> Ingredient:
    """Coffee beans (gram). NOTE: fixture does NOT create StockLevel — use ``stocked_pantry``."""
    ing = Ingredient(name="Coffee Beans", unit=Unit.GRAM)
    session.add(ing)
    session.commit()
    session.refresh(ing)
    return ing


@pytest.fixture(name="ingredient_milk")
def ingredient_milk_fixture(session: Session) -> Ingredient:
    ing = Ingredient(name="Milk", unit=Unit.MILLILITER)
    session.add(ing)
    session.commit()
    session.refresh(ing)
    return ing


@pytest.fixture(name="product_latte")
def product_latte_fixture(
    session: Session,
    category_coffee: Category,
    ingredient_beans: Ingredient,
    ingredient_milk: Ingredient,
) -> Product:
    """Latte: 18g beans + 180ml milk per cup at 65 baht."""
    product = Product(
        name="Latte",
        category_id=category_coffee.id,
        price=Decimal("65.00"),
        cost=Decimal("18.00"),
    )
    session.add(product)
    session.flush()
    session.add(
        Recipe(
            product_id=product.id,
            ingredient_id=ingredient_beans.id,
            qty=Decimal("18.0000"),
            unit=Unit.GRAM,
        )
    )
    session.add(
        Recipe(
            product_id=product.id,
            ingredient_id=ingredient_milk.id,
            qty=Decimal("180.0000"),
            unit=Unit.MILLILITER,
        )
    )
    session.commit()
    session.refresh(product)
    return product


@pytest.fixture(name="modifier_extra_shot")
def modifier_extra_shot_fixture(session: Session) -> Modifier:
    modifier = Modifier(name="Extra shot", price_delta=Decimal("10.00"), group="extras")
    session.add(modifier)
    session.commit()
    session.refresh(modifier)
    return modifier


@pytest.fixture(name="stocked_pantry")
def stocked_pantry_fixture(
    session: Session,
    ingredient_beans: Ingredient,
    ingredient_milk: Ingredient,
) -> None:
    """1 kg beans + 5 L milk on hand — enough for many lattes."""
    session.add(StockLevel(ingredient_id=ingredient_beans.id, quantity=Decimal("1000")))
    session.add(StockLevel(ingredient_id=ingredient_milk.id, quantity=Decimal("5000")))
    session.commit()
