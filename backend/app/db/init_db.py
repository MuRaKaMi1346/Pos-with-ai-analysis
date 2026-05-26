"""Seed initial data.

Step 1 stub — actual admin / default category seed is wired in Step 2 once auth
is in place (we need ``hash_password`` working end-to-end before storing an
admin row).
"""

from sqlmodel import Session

from app.core.config import Settings


def init_db(session: Session, settings: Settings) -> None:
    """Create the bootstrap admin user + default categories. No-op in Step 1."""
    _ = (session, settings)  # unused until Step 2
