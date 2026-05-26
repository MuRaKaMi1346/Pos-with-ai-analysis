"""FastAPI dependency aliases + auth dependencies."""

from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_session
from app.models import Role, User
from app.repositories import user_repo

SettingsDep = Annotated[Settings, Depends(get_settings)]
DBSessionDep = Annotated[Session, Depends(get_session)]

# tokenUrl is the path the Swagger "Authorize" button posts to — relative path
# resolves against the OpenAPI server URL.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


def get_current_user(
    settings: SettingsDep,
    session: DBSessionDep,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """Decode the bearer access token, ensure user exists and is active."""
    try:
        payload = decode_token(token, settings)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("invalid_token") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("wrong_token_type")

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise UnauthorizedError("invalid_token") from exc

    user = user_repo.get_by_id(session, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("user_inactive")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_role(*roles: Role) -> Callable[[User], User]:
    """Dependency factory: ``Depends(require_role(Role.ADMIN))`` -> 403 if mismatch."""
    allowed = set(roles)

    def _dependency(current_user: CurrentUserDep) -> User:
        if current_user.role not in allowed:
            raise ForbiddenError("insufficient_role")
        return current_user

    return _dependency
