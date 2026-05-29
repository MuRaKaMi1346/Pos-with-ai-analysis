"""m3 lifecycle: hold + send-to-kitchen + line/bill void

Revision ID: 453629e4817a
Revises: 70d384e4d6b9
Create Date: 2026-05-29 09:12:42.380924

Adds the lifecycle columns the new state machine needs:

orders:
- ``sent_to_kitchen_at``       — null until "Send to kitchen" fires;
  stock deduction moves to that moment.
- ``voided_at`` / ``voided_by_user_id`` / ``void_reason`` — bill void
  audit trail.

order_items:
- ``kitchen_status``   PENDING (default) → PREPARING (after send-to-
  kitchen) → READY/SERVED (KDS surfaces in M9) / CANCELLED on void.
- ``is_voided``        line-level void flag; voided lines stay on the
  bill but stop contributing to totals.
- ``voided_reason``    free-text reason captured at void time.

``OrderStatus.HOLD`` is a Python-enum addition only — the column is a
plain VARCHAR with no CHECK, so no schema change is needed for the new
value.

Backfill: historical orders had stock deducted at create-time. To keep
the audit trail consistent we treat them as already-sent and set
``sent_to_kitchen_at = created_at`` and ``kitchen_status = PREPARING``
for their lines. (No existing row should be in HOLD state.)
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "453629e4817a"
down_revision: str | Sequence[str] | None = "70d384e4d6b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── orders: lifecycle + void audit columns ──────────────────────
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("sent_to_kitchen_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("voided_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("voided_by_user_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("void_reason", sa.String(length=255), nullable=True))
        batch.create_foreign_key(
            "fk_orders_voided_by_user_id",
            referent_table="users",
            local_cols=["voided_by_user_id"],
            remote_cols=["id"],
        )

    # ── order_items: kitchen status + line void ─────────────────────
    with op.batch_alter_table("order_items") as batch:
        batch.add_column(
            sa.Column(
                "kitchen_status",
                sa.String(length=16),
                nullable=False,
                server_default="PENDING",
            )
        )
        batch.add_column(
            sa.Column("is_voided", sa.Boolean(), nullable=False, server_default=sa.text("0"))
        )
        batch.add_column(sa.Column("voided_reason", sa.String(length=255), nullable=True))
        batch.create_index("ix_order_items_kitchen_status", ["kitchen_status"])
        batch.create_index("ix_order_items_is_voided", ["is_voided"])

    # ── Backfill historical rows ────────────────────────────────────
    # Legacy rows had stock deducted at create — treat them as "sent" so
    # the new audit fields don't look anomalous. Skip voided orders.
    bind.execute(
        sa.text(
            "UPDATE orders SET sent_to_kitchen_at = created_at "
            "WHERE sent_to_kitchen_at IS NULL AND status != 'VOIDED'"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE order_items SET kitchen_status = 'PREPARING' "
            "WHERE order_id IN (SELECT id FROM orders WHERE sent_to_kitchen_at IS NOT NULL)"
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("order_items") as batch:
        batch.drop_index("ix_order_items_is_voided")
        batch.drop_index("ix_order_items_kitchen_status")
        batch.drop_column("voided_reason")
        batch.drop_column("is_voided")
        batch.drop_column("kitchen_status")

    with op.batch_alter_table("orders") as batch:
        batch.drop_constraint("fk_orders_voided_by_user_id", type_="foreignkey")
        batch.drop_column("void_reason")
        batch.drop_column("voided_by_user_id")
        batch.drop_column("voided_at")
        batch.drop_column("sent_to_kitchen_at")
