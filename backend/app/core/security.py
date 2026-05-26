"""Password hashing (Argon2id) + JWT helpers.

Step 1 ships the primitives. Step 2 wires login / refresh / dependency to extract
the current user from a bearer token.
"""

from datetime import timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import Settings
from app.utils.datetime import now_utc

_hasher = PasswordHasher()


# ─── Password hashing ────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a plaintext password with Argon2id (OWASP-recommended)."""
    return _hasher.hash(password)


def verify_password(password: str, hash_str: str) -> bool:
    """Constant-time verification. Returns False on mismatch (no exception)."""
    try:
        return _hasher.verify(hash_str, password)
    except VerifyMismatchError:
        return False


def password_needs_rehash(hash_str: str) -> bool:
    """True when stored hash uses outdated parameters; service should rehash on next login."""
    return _hasher.check_needs_rehash(hash_str)


# ─── JWT tokens ──────────────────────────────────────────────────────


def create_access_token(
    subject: str | int,
    settings: Settings,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Short-lived access token. ``subject`` -> ``sub`` claim (user id)."""
    now = now_utc()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str | int, settings: Settings) -> str:
    """Long-lived refresh token; goes into the httpOnly cookie (see spec section 5)."""
    now = now_utc()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, settings: Settings) -> dict[str, Any]:
    """Decode + verify signature/expiry. Raises ``jwt.PyJWTError`` on failure."""
    return jwt.decode(token, settings.app_secret_key, algorithms=[settings.jwt_algorithm])
