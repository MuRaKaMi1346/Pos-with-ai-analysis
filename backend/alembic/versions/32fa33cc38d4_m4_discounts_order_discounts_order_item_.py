"""m4 discounts + order_discounts + order_item_discounts + audit_logs

Revision ID: 32fa33cc38d4
Revises: 453629e4817a
Create Date: 2026-05-29 09:35:19.348082

Adds four tables:

- ``discounts``            admin-managed master rows (code + type +
                           value + validity window + admin gate).
- ``order_discounts``      per-bill snapshot of an applied discount.
- ``order_item_discounts`` per-line snapshot.
- ``audit_logs``           structured trail (M4 writes for
                           discount-apply / discount-remove; M10 will
                           plug in void / refund / shift / settings).

No legacy backfill needed — these are all new tables.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "32fa33cc38d4"
down_revision: str | Sequence[str] | None = "453629e4817a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "discounts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("scope", sa.String(length=8), nullable=False),
        sa.Column("type", sa.String(length=8), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("min_order_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("max_discount_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("requires_admin", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    with op.batch_alter_table("discounts") as batch:
        batch.create_index("ix_discounts_code", ["code"], unique=True)
        batch.create_index("ix_discounts_scope", ["scope"])
        batch.create_index("ix_discounts_is_active", ["is_active"])

    op.create_table(
        "order_discounts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("discount_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type", sa.String(length=8), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column(
            "amount_off",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("applied_by_user_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_order_discounts_order_id"),
        sa.ForeignKeyConstraint(
            ["discount_id"], ["discounts.id"], name="fk_order_discounts_discount_id"
        ),
        sa.ForeignKeyConstraint(
            ["applied_by_user_id"],
            ["users.id"],
            name="fk_order_discounts_applied_by_user_id",
        ),
    )
    with op.batch_alter_table("order_discounts") as batch:
        batch.create_index("ix_order_discounts_order_id", ["order_id"])

    op.create_table(
        "order_item_discounts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=False),
        sa.Column("discount_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type", sa.String(length=8), nullable=False),
        sa.Column("value", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column(
            "amount_off",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("applied_by_user_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["order_item_id"],
            ["order_items.id"],
            name="fk_order_item_discounts_order_item_id",
        ),
        sa.ForeignKeyConstraint(
            ["discount_id"],
            ["discounts.id"],
            name="fk_order_item_discounts_discount_id",
        ),
        sa.ForeignKeyConstraint(
            ["applied_by_user_id"],
            ["users.id"],
            name="fk_order_item_discounts_applied_by_user_id",
        ),
    )
    with op.batch_alter_table("order_item_discounts") as batch:
        batch.create_index("ix_order_item_discounts_order_item_id", ["order_item_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_audit_logs_user_id"),
    )
    with op.batch_alter_table("audit_logs") as batch:
        batch.create_index("ix_audit_logs_action", ["action"])
        batch.create_index("ix_audit_logs_entity_type", ["entity_type"])
        batch.create_index("ix_audit_logs_created_at", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("order_item_discounts")
    op.drop_table("order_discounts")
    op.drop_table("discounts")
