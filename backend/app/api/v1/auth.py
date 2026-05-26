"""Auth endpoints: /login, /refresh, /logout, /me, /register."""

from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import Settings, get_settings
from app.core.dependencies import (
    CurrentUserDep,
    DBSessionDep,
    SettingsDep,
    require_role,
)
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
)
from app.models import Role, User
from app.repositories import user_repo
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,  # type: ignore[arg-type]
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )


def _issue_tokens(response: Response, user: User, settings: Settings) -> TokenResponse:
    """Mint access + refresh tokens; set refresh in cookie; return access in body."""
    assert user.id is not None
    access = create_access_token(user.id, settings, extra_claims={"role": user.role.value})
    refresh = create_refresh_token(user.id, settings)
    _set_refresh_cookie(response, refresh, settings)
    return TokenResponse(access_token=access)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(get_settings().rate_limit_login)
async def login(
    request: Request,  # required by slowapi
    response: Response,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    settings: SettingsDep,
    session: DBSessionDep,
) -> TokenResponse:
    _ = request  # slowapi reads request via positional arg
    user = auth_service.authenticate(session, username=form.username, password=form.password)
    return _issue_tokens(response, user, settings)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    settings: SettingsDep,
    session: DBSessionDep,
) -> TokenResponse:
    """Rotate refresh + issue new access. Refresh comes from the httpOnly cookie."""
    cookie_token = request.cookies.get(settings.refresh_cookie_name)
    if not cookie_token:
        raise UnauthorizedError("missing_refresh_token")
    try:
        payload = decode_token(cookie_token, settings)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("invalid_refresh_token") from exc
    if payload.get("type") != "refresh":
        raise UnauthorizedError("wrong_token_type")
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise UnauthorizedError("invalid_refresh_token") from exc
    user = auth_service.get_active_user(session, user_id)
    return _issue_tokens(response, user, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, settings: SettingsDep) -> None:
    response.delete_cookie(key=settings.refresh_cookie_name, path="/api/v1/auth")


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUserDep) -> User:
    return current_user


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def register(user_in: UserCreate, session: DBSessionDep) -> User:
    """Admin-only: create a new staff or admin user."""
    if user_repo.get_by_username(session, user_in.username) is not None:
        raise ConflictError("username_exists")
    return user_repo.create(
        session,
        username=user_in.username,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
    )
