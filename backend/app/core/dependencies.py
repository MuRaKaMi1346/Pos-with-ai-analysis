"""FastAPI dependency aliases.

Step 1: settings + DB session.
Step 2 will add ``CurrentUserDep`` / ``require_role(...)`` and OAuth2PasswordBearer.
"""

from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from app.core.config import Settings, get_settings
from app.db.session import get_session

SettingsDep = Annotated[Settings, Depends(get_settings)]
DBSessionDep = Annotated[Session, Depends(get_session)]
