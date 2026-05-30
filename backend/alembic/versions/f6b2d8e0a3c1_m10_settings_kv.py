"""m10 settings key/value store

Revision ID: f6b2d8e0a3c1
Revises: e5a3c9f1b7d4
Create Date: 2026-05-30 15:22:09.661874

Adds the ``settings`` KV table (one row per key, JSON-encoded value) for
admin-editable store config. ``audit_logs`` already exists (created in M4);
M10 only adds the read API + wires "settings changes" through the existing
``audit_service.record`` helper — no schema change there.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f6b2d8e0a3c1"
down_revision: str | Sequence[str] | None = "e5a3c9f1b7d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("key", sa.String(length=100), primary_key=True, nullable=False),
        sa.Column("value_json", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("settings")
