"""Side-effect import: loads every model so ``SQLModel.metadata`` is populated.

Used by Alembic's ``env.py`` (``target_metadata = SQLModel.metadata``) and by
test fixtures that build the schema in memory.
"""

from app import models  # noqa: F401 — needed for side effect

__all__: list[str] = []
