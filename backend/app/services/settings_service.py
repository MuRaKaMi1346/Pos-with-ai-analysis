"""Store settings service (M10).

A small KV store with a typed *effective* view: env/.env defaults (from
``app.core.config.Settings``) overlaid with admin-saved DB overrides. The
effective dict is cached process-wide and invalidated on every write;
``clear_cache`` is called between tests (autouse fixture) to keep the
per-test in-memory DBs isolated.

Scope note (M10): this introduces the durable, admin-editable, audited
store. Rewiring the totals engine (``order_service``) to read VAT / service
/ rounding from here — instead of the env ``Settings`` — is intentionally
left out of this milestone to keep it additive; the engine still uses the
env config. The KV store is the source of truth for receipt/display config.
"""

import json
from typing import Any

from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.models import OrderChannel, User
from app.repositories import setting_repo
from app.schemas.setting import SettingsUpdate
from app.services import audit_service

# Process-wide cache of the merged effective settings; None = cold.
_effective_cache: dict[str, Any] | None = None


def _defaults(cfg: Settings) -> dict[str, Any]:
    """Known keys → default value (sourced from env config where it exists)."""
    return {
        "store_name": cfg.app_name,
        "store_address": None,
        "store_tax_id": None,
        "currency": "THB",
        "vat_rate": cfg.pos_tax_rate,
        "tax_inclusive": cfg.pos_tax_inclusive,
        "service_charge_rate": cfg.pos_service_charge_rate,
        "service_charge_before_vat": cfg.pos_service_charge_before_vat,
        "rounding_mode": cfg.pos_rounding_mode,
        "default_channel": OrderChannel.TAKEAWAY,
        "loyalty_baht_per_earn_point": cfg.pos_loyalty_baht_per_earn_point,
        "loyalty_baht_per_redeem_point": cfg.pos_loyalty_baht_per_redeem_point,
        "receipt_footer": None,
        "receipt_pdf_enabled": False,
        "printer_name": None,
    }


def clear_cache() -> None:
    global _effective_cache
    _effective_cache = None


def get_effective(session: Session) -> dict[str, Any]:
    """Effective settings = env defaults overlaid with DB overrides (cached)."""
    global _effective_cache
    if _effective_cache is not None:
        return dict(_effective_cache)
    merged = _defaults(get_settings())
    for row in setting_repo.list_all(session):
        if row.key in merged:  # ignore unknown/legacy keys
            merged[row.key] = json.loads(row.value_json)
    _effective_cache = dict(merged)
    return dict(merged)


def update(session: Session, changes: SettingsUpdate, *, actor: User) -> dict[str, Any]:
    """Upsert the supplied keys, audit the change, invalidate the cache."""
    fields = changes.model_dump(exclude_unset=True)
    for key, value in fields.items():
        # Decimals/enums → JSON-safe via ``default=str``; bools/ints/None pass through.
        setting_repo.upsert(session, key, json.dumps(value, default=str))
    if fields:
        audit_service.record(
            session,
            actor=actor,
            action="settings.update",
            entity_type="settings",
            entity_id=0,  # KV store has no numeric id; 0 is the sentinel
            payload=fields,
        )
    session.commit()
    clear_cache()
    return get_effective(session)
