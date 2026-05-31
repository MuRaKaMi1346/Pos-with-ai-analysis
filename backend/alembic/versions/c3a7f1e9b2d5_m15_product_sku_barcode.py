"""m15 product sku + barcode

Revision ID: c3a7f1e9b2d5
Revises: f6b2d8e0a3c1
Create Date: 2026-05-31 02:30:00.000000

Adds nullable ``sku`` + ``barcode`` to ``products`` for scan-to-add lookup
(GET /products/lookup). Unique-when-set: a unique index on a nullable column
lets many products keep NULL while distinct codes stay unique (SQLite treats
NULLs as distinct in a unique index).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3a7f1e9b2d5"
down_revision: str | Sequence[str] | None = "f6b2d8e0a3c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("sku", sa.String(length=64), nullable=True))
    op.add_column("products", sa.Column("barcode", sa.String(length=64), nullable=True))
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)
    op.create_index("ix_products_barcode", "products", ["barcode"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_products_barcode", table_name="products")
    op.drop_index("ix_products_sku", table_name="products")
    op.drop_column("products", "barcode")
    op.drop_column("products", "sku")
