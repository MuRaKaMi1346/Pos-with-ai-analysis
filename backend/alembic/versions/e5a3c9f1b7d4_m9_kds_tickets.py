"""m9 kds tickets + category default_station

Revision ID: e5a3c9f1b7d4
Revises: d4b8f2a1c6e9
Create Date: 2026-05-30 14:05:51.778204

Adds:

- ``kds_tickets`` — one per (order, station) created at send-to-kitchen;
  ``status`` NEW → DONE (bump) → IN_PROGRESS (recall).
- ``order_items.kds_ticket_id`` — nullable FK; which station ticket a line
  is routed to.
- ``categories.default_station`` — BAR (default) | KITCHEN; drives routing.

``Station`` / ``KdsStatus`` are stored as their enum NAME (uppercase) like
the other StrEnum columns in this schema; ``default_station`` backfills
existing categories to ``BAR``.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e5a3c9f1b7d4"
down_revision: str | Sequence[str] | None = "d4b8f2a1c6e9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "kds_tickets",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("station", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="NEW"),
        sa.Column("printed_at", sa.DateTime(), nullable=False),
        sa.Column("bumped_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_kds_tickets_order_id"),
    )
    with op.batch_alter_table("kds_tickets") as batch:
        batch.create_index("ix_kds_tickets_order_id", ["order_id"])
        batch.create_index("ix_kds_tickets_station", ["station"])
        batch.create_index("ix_kds_tickets_status", ["status"])
        batch.create_index("ix_kds_tickets_printed_at", ["printed_at"])

    with op.batch_alter_table("order_items") as batch:
        batch.add_column(sa.Column("kds_ticket_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_order_items_kds_ticket_id",
            referent_table="kds_tickets",
            local_cols=["kds_ticket_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_order_items_kds_ticket_id", ["kds_ticket_id"])

    with op.batch_alter_table("categories") as batch:
        batch.add_column(
            sa.Column(
                "default_station",
                sa.String(length=16),
                nullable=False,
                server_default="BAR",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("categories") as batch:
        batch.drop_column("default_station")

    with op.batch_alter_table("order_items") as batch:
        batch.drop_index("ix_order_items_kds_ticket_id")
        batch.drop_constraint("fk_order_items_kds_ticket_id", type_="foreignkey")
        batch.drop_column("kds_ticket_id")

    op.drop_table("kds_tickets")
