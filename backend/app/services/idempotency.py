"""Idempotency-Key store + helpers (M5).

Clients pass an opaque ``Idempotency-Key`` header on retry-sensitive POSTs
(currently ``POST /orders/`` and ``POST /orders/{id}/pay``). The server
replays the prior response when the same key arrives again, and refuses
with 409 when the same key carries a different body.

Scope is ``(key, endpoint, user_id)`` — a single user's key can't be used
to replay another user's response. ``endpoint`` is a **logical** name
(``create_order`` / ``pay_order``) so URL changes don't invalidate keys.

Caveat: the record happens in a separate commit after the work commits.
If the work commits successfully but the record fails (process crash,
network), a retry with the same key will re-execute and may produce a
duplicate. Real-world clients should retry only on 5xx — and ops should
keep ``prune_older_than`` on a daily cron.
"""

import hashlib
import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from sqlmodel import Session, select

from app.core.exceptions import ConflictError
from app.models import IdempotencyKey
from app.utils.datetime import now_utc

IDEMPOTENCY_TTL_HOURS = 24


def _canonical(body: Mapping[str, Any]) -> str:
    """Stable JSON representation for hashing — sorted keys, ``str`` for fancy types."""
    return json.dumps(body, sort_keys=True, default=str)


def _hash(body: Mapping[str, Any]) -> str:
    return hashlib.sha256(_canonical(body).encode("utf-8")).hexdigest()


@dataclass(frozen=True, slots=True)
class IdempotencyHit:
    """A cached response that should be replayed verbatim."""

    status_code: int
    body: dict[str, Any]


def check(
    session: Session,
    *,
    key: str,
    endpoint: str,
    user_id: int,
    request_body: Mapping[str, Any],
) -> IdempotencyHit | None:
    """Look up a cached response.

    Returns the hit if a prior request with the same ``(key, endpoint,
    user_id)`` arrived with the same body. Raises ``ConflictError`` if
    same lookup tuple but different body — that's a real mismatch.
    """
    row = session.exec(
        select(IdempotencyKey)
        .where(IdempotencyKey.key == key)
        .where(IdempotencyKey.endpoint == endpoint)
        .where(IdempotencyKey.user_id == user_id)
    ).first()
    if row is None:
        return None
    if row.request_hash != _hash(request_body):
        raise ConflictError("idempotency_key_mismatch")
    return IdempotencyHit(
        status_code=row.response_status,
        body=json.loads(row.response_json),
    )


def record(
    session: Session,
    *,
    key: str,
    endpoint: str,
    user_id: int,
    request_body: Mapping[str, Any],
    response_status: int,
    response_body: Mapping[str, Any],
) -> None:
    """Persist a response for future replay. Caller commits."""
    row = IdempotencyKey(
        key=key,
        endpoint=endpoint,
        user_id=user_id,
        request_hash=_hash(request_body),
        response_status=response_status,
        response_json=json.dumps(response_body, default=str),
    )
    session.add(row)


def prune_older_than(session: Session, *, hours: int = IDEMPOTENCY_TTL_HOURS) -> int:
    """Delete keys older than ``hours``. Returns the count purged.

    Not scheduled automatically — wire from ops cron / supervisor.
    """
    cutoff = now_utc().replace(tzinfo=None) - timedelta(hours=hours)
    rows = session.exec(select(IdempotencyKey).where(IdempotencyKey.created_at < cutoff)).all()
    count = 0
    for r in rows:
        session.delete(r)
        count += 1
    session.commit()
    return count
