"""m8 cashier shifts + cash drawer movements

Revision ID: d4b8f2a1c6e9
Revises: c7e1a4f0b9d2
Create Date: 2026-05-30 12:40:18.224517

Adds:

- ``cashier_shifts`` — per-cashier till session (opening_float, the
  close-out snapshot expected_cash/closing_cash_counted/cash_variance,
  opened_at/closed_at). A shift is open while ``closed_at IS NULL``.
- ``cash_movements`` — mid-shift drawer pay-ins / pay-outs tied to a shift.
- ``orders.cashier_shift_id``  — nullable FK, stamped at pay time.
- ``refunds.cashier_shift_id`` — nullable FK, stamped at refund time.

No backfill: both FK columns are nullable and historical bills/refunds
pre-date the shift feature.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4b8f2a1c6e9"
down_revision: str | Sequence[str] | None = "c7e1a4f0b9d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cashier_shifts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("opening_float", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("closing_cash_counted", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("expected_cash", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("cash_variance", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("closing_note", sa.String(length=255), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=False),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_cashier_shifts_user_id"),
    )
    with op.batch_alter_table("cashier_shifts") as batch:
        batch.create_index("ix_cashier_shifts_user_id", ["user_id"])
        batch.create_index("ix_cashier_shifts_opened_at", ["opened_at"])
        batch.create_index("ix_cashier_shifts_closed_at", ["closed_at"])

    op.create_table(
        "cash_movements",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("cashier_shift_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["cashier_shift_id"], ["cashier_shifts.id"], name="fk_cash_movements_shift_id"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_cash_movements_user_id"),
    )
    with op.batch_alter_table("cash_movements") as batch:
        batch.create_index("ix_cash_movements_cashier_shift_id", ["cashier_shift_id"])
        batch.create_index("ix_cash_movements_type", ["type"])
        batch.create_index("ix_cash_movements_created_at", ["created_at"])

    # FK columns added after cashier_shifts exists.
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("cashier_shift_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_orders_cashier_shift_id",
            referent_table="cashier_shifts",
            local_cols=["cashier_shift_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_orders_cashier_shift_id", ["cashier_shift_id"])

    with op.batch_alter_table("refunds") as batch:
        batch.add_column(sa.Column("cashier_shift_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_refunds_cashier_shift_id",
            referent_table="cashier_shifts",
            local_cols=["cashier_shift_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_refunds_cashier_shift_id", ["cashier_shift_id"])


def downgrade() -> None:
    with op.batch_alter_table("refunds") as batch:
        batch.drop_index("ix_refunds_cashier_shift_id")
        batch.drop_constraint("fk_refunds_cashier_shift_id", type_="foreignkey")
        batch.drop_column("cashier_shift_id")

    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_cashier_shift_id")
        batch.drop_constraint("fk_orders_cashier_shift_id", type_="foreignkey")
        batch.drop_column("cashier_shift_id")

    op.drop_table("cash_movements")
    op.drop_table("cashier_shifts")
