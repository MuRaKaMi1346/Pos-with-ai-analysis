"""M10 — audit log read API (admin), exercising the existing record helper."""

from fastapi.testclient import TestClient


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_audit_logs_admin_only(client: TestClient, staff_token: str) -> None:
    r = client.get("/api/v1/audit-logs/", headers=_bearer(staff_token))
    assert r.status_code == 403


def test_audit_logs_capture_actions_and_filter(client: TestClient, admin_token: str) -> None:
    # Two distinct audited actions: shift.open (M8) + settings.update (M10).
    client.post(
        "/api/v1/shifts/open", headers=_bearer(admin_token), json={"opening_float": "0.00"}
    ).raise_for_status()
    client.patch(
        "/api/v1/settings/", headers=_bearer(admin_token), json={"store_name": "Cafe"}
    ).raise_for_status()

    everything = client.get("/api/v1/audit-logs/", headers=_bearer(admin_token))
    assert everything.status_code == 200
    actions = {row["action"] for row in everything.json()}
    assert {"shift.open", "settings.update"} <= actions

    settings_logs = client.get(
        "/api/v1/audit-logs/?action=settings.update", headers=_bearer(admin_token)
    ).json()
    assert len(settings_logs) == 1
    assert settings_logs[0]["entity_type"] == "settings"

    shift_logs = client.get(
        "/api/v1/audit-logs/?entity_type=cashier_shift", headers=_bearer(admin_token)
    ).json()
    assert len(shift_logs) == 1
    assert shift_logs[0]["action"] == "shift.open"
