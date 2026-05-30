"""m7 customers + loyalty

Revision ID: c7e1a4f0b9d2
Revises: ec9c1f649bef
Create Date: 2026-05-30 11:18:44.512003

Adds the ``customers`` table (profile + lifetime aggregates + the
``pending_redemption_baht`` flag the next bill picks up) and an optional
``customer_id`` FK on ``orders`` (null for walk-ins).

``DiscountType.POINTS`` is a Python-enum addition only — the discount
``type`` column is a plain VARCHAR with no CHECK, so no schema change is
needed for the new value.

No backfill: ``orders.customer_id`` is nullable and existing bills are
walk-ins by definition.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c7e1a4f0b9d2"
down_revision: str | Sequence[str] | None = "ec9c1f649bef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("email", sa.String(length=120), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column(
            "loyalty_points", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "total_spend",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_visits", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column("last_visit_at", sa.DateTime(), nullable=True),
        sa.Column(
            "pending_redemption_baht",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    with op.batch_alter_table("customers") as batch:
        batch.create_index("ix_customers_code", ["code"], unique=True)
        batch.create_index("ix_customers_phone", ["phone"], unique=True)
        batch.create_index("ix_customers_is_active", ["is_active"])

    # orders.customer_id — nullable FK (created after ``customers`` exists).
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("customer_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_orders_customer_id",
            referent_table="customers",
            local_cols=["customer_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_orders_customer_id", ["customer_id"])


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_customer_id")
        batch.drop_constraint("fk_orders_customer_id", type_="foreignkey")
        batch.drop_column("customer_id")
    op.drop_table("customers")
