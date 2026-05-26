"""User + Role enum.

Auth fields (password_hash) are stored here but the login flow lands in Step 2.
"""

from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel

from app.utils.datetime import now_utc


class Role(StrEnum):
    ADMIN = "admin"
    STAFF = "staff"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True, max_length=64)
    password_hash: str = Field(max_length=255)
    role: Role = Field(default=Role.STAFF, index=True)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)
