"""Tests for product image upload (POST /api/v1/products/image)."""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import app

# Smallest valid PNG (1x1, transparent) — a real image payload for the happy path.
_PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082"
)


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="media_tmp")
def media_tmp_fixture(tmp_path: Path) -> Generator[Path, None, None]:
    """Point uploads at a throwaway dir so tests never write into the repo."""

    def _settings() -> config.Settings:
        return config.Settings(upload_dir=str(tmp_path))

    app.dependency_overrides[config.get_settings] = _settings
    yield tmp_path
    app.dependency_overrides.pop(config.get_settings, None)


def test_upload_image_as_admin(client: TestClient, admin_token: str, media_tmp: Path) -> None:
    response = client.post(
        "/api/v1/products/image",
        headers=_bearer(admin_token),
        files={"file": ("logo.png", _PNG_1PX, "image/png")},
    )
    assert response.status_code == 201
    url = response.json()["url"]
    assert url.startswith("/media/products/")
    assert url.endswith(".png")
    # File actually landed on disk under the temp upload dir.
    saved = media_tmp / "products" / url.rsplit("/", 1)[1]
    assert saved.read_bytes() == _PNG_1PX


def test_upload_rejects_non_image(client: TestClient, admin_token: str, media_tmp: Path) -> None:
    _ = media_tmp
    response = client.post(
        "/api/v1/products/image",
        headers=_bearer(admin_token),
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["code"] == "unsupported_media_type"


def test_upload_rejects_empty_file(client: TestClient, admin_token: str, media_tmp: Path) -> None:
    _ = media_tmp
    response = client.post(
        "/api/v1/products/image",
        headers=_bearer(admin_token),
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert response.status_code == 400


def test_upload_rejects_oversized_file(
    client: TestClient, admin_token: str, tmp_path: Path
) -> None:
    def _settings() -> config.Settings:
        return config.Settings(upload_dir=str(tmp_path), max_image_upload_mb=1)

    app.dependency_overrides[config.get_settings] = _settings
    try:
        response = client.post(
            "/api/v1/products/image",
            headers=_bearer(admin_token),
            files={"file": ("big.png", b"\x00" * (1024 * 1024 + 1), "image/png")},
        )
    finally:
        app.dependency_overrides.pop(config.get_settings, None)
    assert response.status_code == 413
    assert response.json()["code"] == "file_too_large"


def test_upload_requires_admin(client: TestClient, staff_token: str, media_tmp: Path) -> None:
    _ = media_tmp
    response = client.post(
        "/api/v1/products/image",
        headers=_bearer(staff_token),
        files={"file": ("logo.png", _PNG_1PX, "image/png")},
    )
    assert response.status_code == 403


def test_upload_requires_auth(client: TestClient, media_tmp: Path) -> None:
    _ = media_tmp
    response = client.post(
        "/api/v1/products/image",
        files={"file": ("logo.png", _PNG_1PX, "image/png")},
    )
    assert response.status_code == 401


def test_uploaded_image_round_trips_onto_product(
    client: TestClient, admin_token: str, media_tmp: Path
) -> None:
    _ = media_tmp
    upload = client.post(
        "/api/v1/products/image",
        headers=_bearer(admin_token),
        files={"file": ("latte.png", _PNG_1PX, "image/png")},
    )
    url = upload.json()["url"]

    created = client.post(
        "/api/v1/products/",
        headers=_bearer(admin_token),
        json={"name": "Latte Pic", "price": "65.00", "image": url},
    )
    assert created.status_code == 201
    assert created.json()["image"] == url
