"""M10 — store settings KV (effective view + admin patch + audit + cache)."""

from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import get_settings
from app.models import AuditLog


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_get_settings_returns_effective_defaults(client: TestClient, staff_token: str) -> None:
    r = client.get("/api/v1/settings/", headers=_bearer(staff_token))
    assert r.status_code == 200
    body = r.json()
    assert body["store_name"] == get_settings().app_name
    assert body["currency"] == "THB"
    assert Decimal(body["vat_rate"]) == Decimal("0.07")
    assert body["tax_inclusive"] is True
    assert body["rounding_mode"] == "TWO_DECIMALS"
    assert body["default_channel"] == "takeaway"
    assert body["receipt_pdf_enabled"] is False


def test_patch_settings_persists(client: TestClient, admin_token: str) -> None:
    patch = client.patch(
        "/api/v1/settings/",
        headers=_bearer(admin_token),
        json={"store_name": "My Cafe", "vat_rate": "0.10", "receipt_footer": "Thank you!"},
    )
    assert patch.status_code == 200
    assert patch.json()["store_name"] == "My Cafe"
    assert Decimal(patch.json()["vat_rate"]) == Decimal("0.10")
    # Persisted on a fresh GET (cache was invalidated on write).
    body = client.get("/api/v1/settings/", headers=_bearer(admin_token)).json()
    assert body["store_name"] == "My Cafe"
    assert Decimal(body["vat_rate"]) == Decimal("0.10")
    assert body["receipt_footer"] == "Thank you!"


def test_patch_requires_admin(client: TestClient, staff_token: str) -> None:
    r = client.patch("/api/v1/settings/", headers=_bearer(staff_token), json={"store_name": "X"})
    assert r.status_code == 403


def test_patch_writes_audit_log(client: TestClient, admin_token: str, session: Session) -> None:
    client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"store_name": "Audited"}
    ).raise_for_status()
    rows = session.exec(select(AuditLog).where(AuditLog.action == "settings.update")).all()
    assert len(rows) == 1
    assert rows[0].entity_type == "settings"
    assert '"store_name": "Audited"' in (rows[0].payload_json or "")


def test_decimal_setting_round_trips(client: TestClient, admin_token: str) -> None:
    client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"vat_rate": "0.0850"}
    ).raise_for_status()
    body = client.get("/api/v1/settings/", headers=_bearer(admin_token)).json()
    assert Decimal(body["vat_rate"]) == Decimal("0.0850")


def test_patch_default_channel(client: TestClient, admin_token: str) -> None:
    client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"default_channel": "dine_in"}
    ).raise_for_status()
    body = client.get("/api/v1/settings/", headers=_bearer(admin_token)).json()
    assert body["default_channel"] == "dine_in"


def test_patch_invalid_rounding_mode_returns_422(client: TestClient, admin_token: str) -> None:
    r = client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"rounding_mode": "BOGUS"}
    )
    assert r.status_code == 422


def test_patch_vat_rate_out_of_range_returns_422(client: TestClient, admin_token: str) -> None:
    r = client.patch("/api/v1/settings/", headers=_bearer(admin_token), json={"vat_rate": "1.5"})
    assert r.status_code == 422
