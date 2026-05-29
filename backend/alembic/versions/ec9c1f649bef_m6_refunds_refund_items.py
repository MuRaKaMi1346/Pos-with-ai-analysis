"""m6 refunds + refund_items

Revision ID: ec9c1f649bef
Revises: 207e72fe3122
Create Date: 2026-05-29 10:11:09.318041

Adds two tables:

- ``refunds``       per-bill refund header (refund_number unique,
                    amount, reason, refunded_by_user_id, created_at).
- ``refund_items``  per-line refund (qty, amount, restock flag, FK to
                    the original OrderItem).

OrderStatus gains ``PARTIALLY_REFUNDED`` — Python enum addition only,
no schema change (status column is plain VARCHAR with no CHECK).

cashier_shift_id is deferred to M8 (shifts).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ec9c1f649bef"
down_revision: str | Sequence[str] | None = "207e72fe3122"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("refund_number", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("refunded_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name="fk_refunds_order_id"
        ),
        sa.ForeignKeyConstraint(
            ["refunded_by_user_id"],
            ["users.id"],
            name="fk_refunds_refunded_by_user_id",
        ),
    )
    with op.batch_alter_table("refunds") as batch:
        batch.create_index("ix_refunds_order_id", ["order_id"])
        batch.create_index("ix_refunds_refund_number", ["refund_number"], unique=True)
        batch.create_index("ix_refunds_created_at", ["created_at"])

    op.create_table(
        "refund_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("refund_id", sa.Integer(), nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "restock", sa.Boolean(), nullable=False, server_default=sa.text("1")
        ),
        sa.ForeignKeyConstraint(
            ["refund_id"], ["refunds.id"], name="fk_refund_items_refund_id"
        ),
        sa.ForeignKeyConstraint(
            ["order_item_id"],
            ["order_items.id"],
            name="fk_refund_items_order_item_id",
        ),
    )
    with op.batch_alter_table("refund_items") as batch:
        batch.create_index("ix_refund_items_refund_id", ["refund_id"])
        batch.create_index("ix_refund_items_order_item_id", ["order_item_id"])


def downgrade() -> None:
    op.drop_table("refund_items")
    op.drop_table("refunds")
