"""m2 modifier groups + modifier recipes

Revision ID: 70d384e4d6b9
Revises: 7a0ebd6195ff
Create Date: 2026-05-28 23:14:01.451372

Adds:

- ``modifier_groups`` table — id / name / min_select / max_select /
  is_required / sort_order.
- ``modifiers.group_id`` FK → modifier_groups (replaces ``group`` str).
- ``modifiers.sort_order`` for in-group ordering.
- ``recipes.modifier_id`` FK + XOR with ``product_id`` (``product_id``
  becomes nullable; CHECK enforces exactly one is set).
- a UNIQUE on (modifier_id, ingredient_id) so a modifier can declare
  only one BOM line per ingredient (SQLite treats NULLs as distinct so
  the existing product UQ keeps working for modifier-NULL rows).

Legacy rows: each distinct legacy ``modifiers.group`` string becomes one
``ModifierGroup`` row (defaults: min=0, max=1, required=false). Existing
modifiers are repointed via ``group_id`` and the old ``group`` column is
dropped at the end.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "70d384e4d6b9"
down_revision: str | Sequence[str] | None = "7a0ebd6195ff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. New parent table ─────────────────────────────────────────
    op.create_table(
        "modifier_groups",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("min_select", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_select", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("name", name="uq_modifier_groups_name"),
    )

    # ── 2. Extend ``modifiers`` with nullable group_id + sort_order ─
    with op.batch_alter_table("modifiers") as batch:
        batch.add_column(sa.Column("group_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))

    # ── 3. Backfill: one ModifierGroup row per distinct legacy group ─
    bind.execute(
        sa.text(
            "INSERT INTO modifier_groups (name, min_select, max_select, "
            "is_required, sort_order) "
            'SELECT DISTINCT "group", 0, 1, 0, 0 FROM modifiers '
            'WHERE "group" IS NOT NULL AND "group" <> \'\''
        )
    )
    bind.execute(
        sa.text(
            "UPDATE modifiers SET group_id = ("
            'SELECT mg.id FROM modifier_groups mg WHERE mg.name = modifiers."group"'
            ") "
            'WHERE "group" IS NOT NULL AND "group" <> \'\''
        )
    )

    # ── 4. Tighten + drop legacy column ──────────────────────────────
    with op.batch_alter_table("modifiers") as batch:
        batch.alter_column("group_id", nullable=False, existing_type=sa.Integer())
        batch.create_foreign_key(
            "fk_modifiers_group_id",
            referent_table="modifier_groups",
            local_cols=["group_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_modifiers_group_id", ["group_id"])
        batch.drop_index("ix_modifiers_group")
        batch.drop_column("group")

    # ── 5. Recipes: product_id → nullable, add modifier_id + XOR ────
    with op.batch_alter_table("recipes") as batch:
        batch.alter_column("product_id", existing_type=sa.Integer(), nullable=True)
        batch.add_column(sa.Column("modifier_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_recipes_modifier_id",
            referent_table="modifiers",
            local_cols=["modifier_id"],
            remote_cols=["id"],
        )
        batch.create_index("ix_recipes_modifier_id", ["modifier_id"])
        batch.create_unique_constraint(
            "uq_recipe_modifier_ingredient", ["modifier_id", "ingredient_id"]
        )
        batch.create_check_constraint(
            "ck_recipe_owner_xor",
            "(product_id IS NOT NULL) <> (modifier_id IS NOT NULL)",
        )


def downgrade() -> None:
    bind = op.get_bind()

    # Refuse to downgrade if any modifier-only recipes exist — restoring
    # product_id NOT NULL would silently fail at the row-rewrite step.
    orphan = bind.execute(sa.text("SELECT COUNT(*) FROM recipes WHERE product_id IS NULL")).scalar()
    if orphan:
        raise RuntimeError(
            f"downgrade refused: {orphan} modifier-only recipe row(s) exist; "
            "delete them or null out modifier_id and back-link to a product first"
        )

    # Recipes: drop XOR + modifier column; restore product_id NOT NULL
    with op.batch_alter_table("recipes") as batch:
        batch.drop_constraint("ck_recipe_owner_xor", type_="check")
        batch.drop_constraint("uq_recipe_modifier_ingredient", type_="unique")
        batch.drop_index("ix_recipes_modifier_id")
        batch.drop_constraint("fk_recipes_modifier_id", type_="foreignkey")
        batch.drop_column("modifier_id")
        batch.alter_column("product_id", existing_type=sa.Integer(), nullable=False)

    # Restore modifiers.group str column + repopulate from group_id
    with op.batch_alter_table("modifiers") as batch:
        batch.add_column(sa.Column("group", sa.String(length=50), nullable=True))
    bind.execute(
        sa.text(
            'UPDATE modifiers SET "group" = ('
            "SELECT mg.name FROM modifier_groups mg WHERE mg.id = modifiers.group_id"
            ")"
        )
    )
    with op.batch_alter_table("modifiers") as batch:
        batch.alter_column("group", existing_type=sa.String(length=50), nullable=False)
        batch.create_index("ix_modifiers_group", ["group"])
        batch.drop_index("ix_modifiers_group_id")
        batch.drop_constraint("fk_modifiers_group_id", type_="foreignkey")
        batch.drop_column("group_id")
        batch.drop_column("sort_order")

    op.drop_table("modifier_groups")
