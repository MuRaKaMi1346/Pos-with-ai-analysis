"""m1 order fields: channel + table_number + totals breakdown

Revision ID: 7a0ebd6195ff
Revises: a2f0f571fd3e
Create Date: 2026-05-28 22:58:31.303799

Adds these columns to ``orders`` so the POS can track a richer bill:

- ``order_number``  human-friendly per-day rolling id (unique)
- ``channel``       DINE_IN | TAKEAWAY | DELIVERY (indexed)
- ``table_number``  free-text 16-char slot for dine-in
- totals breakdown: subtotal, discount_total, service_charge(+_rate),
  tax_total(+_rate), tax_inclusive, tip_total, rounding_adjustment,
  paid_total, change_due

Legacy rows are backfilled (``order_number = YYYYMMDD-0000id``,
``subtotal = total``, everything else 0) before NOT NULL/unique
constraints are applied, so this migration is safe on a live DB.

NOTE: SQLite is the dev/prod target — ``batch_alter_table`` rewrites the
table so we can flip nullable + add unique indexes after backfill.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "7a0ebd6195ff"
down_revision: str | Sequence[str] | None = "a2f0f571fd3e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Add new columns nullable / defaulted so legacy rows survive ──
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("order_number", sa.String(length=20), nullable=True))
        batch.add_column(
            sa.Column(
                "channel",
                sa.String(length=16),
                nullable=False,
                server_default="TAKEAWAY",
            )
        )
        batch.add_column(sa.Column("table_number", sa.String(length=16), nullable=True))

        batch.add_column(
            sa.Column(
                "subtotal",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "discount_total",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "service_charge",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "service_charge_rate",
                sa.Numeric(precision=5, scale=4),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "tax_total",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "tax_rate",
                sa.Numeric(precision=5, scale=4),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "tax_inclusive",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("1"),
            )
        )
        batch.add_column(
            sa.Column(
                "tip_total",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "rounding_adjustment",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "paid_total",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column(
                "change_due",
                sa.Numeric(precision=12, scale=2),
                nullable=False,
                server_default="0",
            )
        )

    # ── 2. Backfill order_number + subtotal for legacy rows ────────────
    # order_number uses the row id padded to 4 digits as the per-day suffix.
    # Across-day collisions are impossible because (date_part, id) is unique
    # — id is the table PK.
    bind.execute(
        sa.text(
            "UPDATE orders "
            "SET order_number = strftime('%Y%m%d', created_at) "
            "                   || '-' || printf('%04d', id) "
            "WHERE order_number IS NULL"
        )
    )
    bind.execute(sa.text("UPDATE orders SET subtotal = total WHERE subtotal = 0"))

    # ── 3. Tighten constraints now that data is sound ──────────────────
    with op.batch_alter_table("orders") as batch:
        batch.alter_column("order_number", nullable=False, existing_type=sa.String(length=20))
        batch.create_index("ix_orders_order_number", ["order_number"], unique=True)
        batch.create_index("ix_orders_channel", ["channel"])


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_channel")
        batch.drop_index("ix_orders_order_number")
        for col in (
            "change_due",
            "paid_total",
            "rounding_adjustment",
            "tip_total",
            "tax_inclusive",
            "tax_rate",
            "tax_total",
            "service_charge_rate",
            "service_charge",
            "discount_total",
            "subtotal",
            "table_number",
            "channel",
            "order_number",
        ):
            batch.drop_column(col)
