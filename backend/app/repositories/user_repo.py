"""User repository — the only place that talks SQL for the ``users`` table."""

from sqlmodel import Session, select

from app.models import Role, User


def get_by_id(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def get_by_username(session: Session, username: str) -> User | None:
    return session.exec(select(User).where(User.username == username)).first()


def create(
    session: Session,
    *,
    username: str,
    password_hash: str,
    role: Role,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        password_hash=password_hash,
        role=role,
        is_active=is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
