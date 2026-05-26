"""Auth-related Pydantic schemas (request/response)."""

from pydantic import BaseModel


class TokenResponse(BaseModel):
    """Standard OAuth2 token payload returned by ``/auth/login`` and ``/auth/refresh``."""

    access_token: str
    token_type: str = "bearer"  # noqa: S105 — schema literal, not a credential
