"""m5 payment extensions + closed_at + idempotency_keys

Revision ID: 207e72fe3122
Revises: 32fa33cc38d4
Create Date: 2026-05-29 09:52:05.834486

Adds:

orders:
- ``closed_at``  — datetime nullable. Set when the bill flips to PAID;
                   stays null in OPEN / HOLD / VOIDED.

payments:
- ``reference``         VARCHAR(100) NULL — card last-4 / QR ref / etc.
- ``tendered_amount``   NUMERIC(12,2) NULL — for cash, the customer-handed
                                            amount; non-cash leaves it null.
- ``is_refund``         BOOL NOT NULL DEFAULT 0 — M6 refund rows flip true.
- ``voided``            BOOL NOT NULL DEFAULT 0 — voided tender (audit).
- ``voided_at``         DATETIME NULL

idempotency_keys:
- (id, key, endpoint, user_id, request_hash, response_status,
   response_json, created_at). Unique key is (key, endpoint, user_id) —
   modelled here as an index that fits SQLite's batch_alter_table.

No backfill needed — every addition has a safe default / nullable.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "207e72fe3122"
down_revision: str | Sequence[str] | None = "32fa33cc38d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("closed_at", sa.DateTime(), nullable=True))

    with op.batch_alter_table("payments") as batch:
        batch.add_column(sa.Column("reference", sa.String(length=100), nullable=True))
        batch.add_column(
            sa.Column("tendered_amount", sa.Numeric(precision=12, scale=2), nullable=True)
        )
        batch.add_column(
            sa.Column(
                "is_refund", sa.Boolean(), nullable=False, server_default=sa.text("0")
            )
        )
        batch.add_column(
            sa.Column(
                "voided", sa.Boolean(), nullable=False, server_default=sa.text("0")
            )
        )
        batch.add_column(sa.Column("voided_at", sa.DateTime(), nullable=True))
        batch.create_index("ix_payments_is_refund", ["is_refund"])
        batch.create_index("ix_payments_voided", ["voided"])

    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("endpoint", sa.String(length=120), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_status", sa.Integer(), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_idempotency_keys_user_id"
        ),
    )
    with op.batch_alter_table("idempotency_keys") as batch:
        batch.create_index(
            "ux_idempotency_keys_lookup",
            ["key", "endpoint", "user_id"],
            unique=True,
        )
        batch.create_index("ix_idempotency_keys_created_at", ["created_at"])


def downgrade() -> None:
    op.drop_table("idempotency_keys")

    with op.batch_alter_table("payments") as batch:
        batch.drop_index("ix_payments_voided")
        batch.drop_index("ix_payments_is_refund")
        batch.drop_column("voided_at")
        batch.drop_column("voided")
        batch.drop_column("is_refund")
        batch.drop_column("tendered_amount")
        batch.drop_column("reference")

    with op.batch_alter_table("orders") as batch:
        batch.drop_column("closed_at")
