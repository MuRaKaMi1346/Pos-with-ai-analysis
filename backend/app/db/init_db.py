"""Seed initial DB rows. Currently: bootstrap admin user.

Idempotent — safe to call on every startup. Skipped in tests via
``settings.app_env == "test"`` guard in ``main.lifespan``.
"""

import logging

from sqlmodel import Session, select

from app.core.config import Settings
from app.core.security import hash_password
from app.models import Role, User

logger = logging.getLogger(__name__)


def init_db(session: Session, settings: Settings) -> None:
    """Create the bootstrap admin user if missing."""
    existing = session.exec(
        select(User).where(User.username == settings.seed_admin_username)
    ).first()
    if existing is not None:
        return

    admin = User(
        username=settings.seed_admin_username,
        password_hash=hash_password(settings.seed_admin_password),
        role=Role.ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()
    logger.info("Seeded admin user %r", settings.seed_admin_username)
