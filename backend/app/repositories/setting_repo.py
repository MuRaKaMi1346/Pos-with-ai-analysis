"""Store settings (KV) repository (M10)."""

from collections.abc import Sequence

from sqlmodel import Session, select

from app.models import AppSetting
from app.utils.datetime import now_utc


def get(session: Session, key: str) -> AppSetting | None:
    return session.get(AppSetting, key)


def list_all(session: Session) -> Sequence[AppSetting]:
    return session.exec(select(AppSetting)).all()


def upsert(session: Session, key: str, value_json: str) -> AppSetting:
    row = session.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value_json=value_json)
        session.add(row)
        return row
    row.value_json = value_json
    row.updated_at = now_utc()
    session.add(row)
    return row
