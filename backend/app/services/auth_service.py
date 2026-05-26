"""Authentication business logic.

Returns ``UnauthorizedError`` with a *single* generic message for every failure
(unknown user / wrong password / inactive). This prevents username enumeration.
"""

from sqlmodel import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import hash_password, password_needs_rehash, verify_password
from app.models import User
from app.repositories import user_repo
from app.utils.datetime import now_utc


def authenticate(session: Session, *, username: str, password: str) -> User:
    """Verify credentials and return the user; raise ``UnauthorizedError`` on any failure."""
    user = user_repo.get_by_username(session, username)
    if user is None or not user.is_active:
        raise UnauthorizedError("invalid_credentials")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("invalid_credentials")
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        user.updated_at = now_utc()
        session.add(user)
        session.commit()
    return user


def get_active_user(session: Session, user_id: int) -> User:
    """Load a user by id, requiring ``is_active=True``."""
    user = user_repo.get_by_id(session, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("user_inactive")
    return user
