"""User schemas — kept strictly separate from the SQLModel ``User`` row.

``UserRead`` is what we ever return to clients. ``password_hash`` is never
exposed; ``UserCreate.password`` is plaintext only on the way in.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import Role


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.STAFF


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime
