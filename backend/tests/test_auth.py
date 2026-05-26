"""End-to-end tests for the auth flow + security middleware."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import hash_password
from app.models import Role, User

# ── Login ────────────────────────────────────────────────────────────


def test_login_returns_access_token_and_sets_refresh_cookie(
    client: TestClient, admin_user: User
) -> None:
    _ = admin_user
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "AdminPass123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert "sb_refresh" in response.cookies


def test_login_wrong_password_returns_401(client: TestClient, admin_user: User) -> None:
    _ = admin_user
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "wrong"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_login_unknown_user_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody", "password": "WhateverPass1"},
    )
    assert response.status_code == 401


def test_login_inactive_user_returns_401(client: TestClient, session: Session) -> None:
    banned = User(
        username="banned",
        password_hash=hash_password("BannedPass1"),
        role=Role.STAFF,
        is_active=False,
    )
    session.add(banned)
    session.commit()
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "banned", "password": "BannedPass1"},
    )
    assert response.status_code == 401


# ── /me ──────────────────────────────────────────────────────────────


def test_me_with_valid_token_returns_user(client: TestClient, admin_token: str) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"
    assert "password_hash" not in body


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.real.jwt"},
    )
    assert response.status_code == 401


def test_me_with_refresh_token_in_authorization_returns_401(
    client: TestClient, admin_user: User
) -> None:
    """A refresh token must not be accepted as an access token."""
    _ = admin_user
    client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "AdminPass123"},
    )
    refresh_jwt = client.cookies.get("sb_refresh")
    assert refresh_jwt
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_jwt}"},
    )
    assert response.status_code == 401


# ── Refresh ──────────────────────────────────────────────────────────


def test_refresh_with_cookie_returns_new_access(client: TestClient, admin_user: User) -> None:
    _ = admin_user
    client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "AdminPass123"},
    )
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_refresh_without_cookie_returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


# ── Logout ───────────────────────────────────────────────────────────


def test_logout_clears_cookie_and_breaks_refresh(client: TestClient, admin_user: User) -> None:
    _ = admin_user
    client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "AdminPass123"},
    )
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    refresh = client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401


# ── /register (RBAC) ─────────────────────────────────────────────────


def test_register_without_token_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "newbie", "password": "NewPass1234", "role": "staff"},
    )
    assert response.status_code == 401


def test_register_as_staff_returns_403(client: TestClient, staff_token: str) -> None:
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"username": "newbie", "password": "NewPass1234", "role": "staff"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden"


def test_register_as_admin_creates_user(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "newbie", "password": "NewPass1234", "role": "staff"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "newbie"
    assert body["role"] == "staff"
    assert "password_hash" not in body


def test_register_duplicate_username_returns_409(
    client: TestClient, admin_token: str, staff_user: User
) -> None:
    _ = staff_user
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "staff", "password": "Whatever123", "role": "staff"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "conflict"


def test_register_validates_username_pattern(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"username": "bad name with space", "password": "OkPass1234", "role": "staff"},
    )
    assert response.status_code == 422


# ── Security headers ─────────────────────────────────────────────────


def test_security_headers_present_on_response(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "no-referrer"
