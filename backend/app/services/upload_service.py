"""Product image uploads (menu pictures).

A thin file-I/O service the products router calls to persist an uploaded image.
Files live on local disk under ``settings.upload_dir/products`` and are served
read-only via the ``/media`` static mount (see ``app/main.py``) — nothing leaves
the machine. We never trust the client-supplied filename: each image gets a
fresh ``uuid4`` name with a whitelisted extension, which sidesteps path
traversal and name collisions.
"""

import uuid
from pathlib import Path

from fastapi import UploadFile, status

from app.core.config import Settings
from app.core.exceptions import ValidationError

# Whitelisted content type -> the extension we store the file under.
_ALLOWED_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
_SUBDIR = "products"
_PUBLIC_PREFIX = "/media"


def _target_dir(settings: Settings) -> Path:
    """Ensure and return the on-disk directory product images are written to."""
    directory = Path(settings.upload_dir) / _SUBDIR
    directory.mkdir(parents=True, exist_ok=True)
    return directory


async def save_product_image(file: UploadFile, settings: Settings) -> str:
    """Validate and persist an uploaded menu image; return its public URL path.

    The returned path (e.g. ``/media/products/<uuid>.png``) is stored verbatim in
    ``Product.image`` and used directly as an ``<img>`` ``src``.

    Raises ``ValidationError`` with the matching HTTP status for an unsupported
    type (415), an empty body (400), or a file over ``max_image_upload_mb`` (413).
    """
    extension = _ALLOWED_TYPES.get((file.content_type or "").lower())
    if extension is None:
        raise ValidationError(
            f"unsupported_image_type:{file.content_type}",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="unsupported_media_type",
        )

    data = await file.read()
    if not data:
        raise ValidationError("empty_file")

    max_bytes = settings.max_image_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise ValidationError(
            f"file_too_large:max_{settings.max_image_upload_mb}mb",
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            code="file_too_large",
        )

    filename = f"{uuid.uuid4().hex}{extension}"
    (_target_dir(settings) / filename).write_bytes(data)
    return f"{_PUBLIC_PREFIX}/{_SUBDIR}/{filename}"
