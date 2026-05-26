"""slowapi limiter + 429 handler.

The Limiter instance is shared (single in-memory store by default). Per-route
limits are applied with ``@limiter.limit("10/minute")`` decorators.
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)


async def rate_limit_exceeded_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "code": "rate_limited",
            "message": f"Too many requests: {exc.detail}",
        },
    )
