"""Alembic environment.

Configured for SmartBrew:
- ``target_metadata = SQLModel.metadata`` (via ``app.db.base`` side-effect import)
- DB URL is loaded from ``Settings`` (``app.core.config``) — alembic.ini is ignored
- ``render_as_batch=True`` so SQLite can ALTER TABLE via copy/swap
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# Make ``app`` importable when alembic is run from the backend/ dir.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.db.base as _models_base  # registers tables on SQLModel.metadata
from app.core.config import get_settings

_ = _models_base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the alembic.ini URL with the live Settings URL.
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without a DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
