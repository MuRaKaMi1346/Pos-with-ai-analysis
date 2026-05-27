"""Generic CRUD wrapper. Per-entity repos instantiate this + add domain queries."""

from collections.abc import Sequence
from typing import Generic, TypeVar

from sqlmodel import Session, SQLModel, select

ModelT = TypeVar("ModelT", bound=SQLModel)


class BaseRepository(Generic[ModelT]):
    """Pass an SQLModel subclass; get free typed CRUD."""

    def __init__(self, model: type[ModelT]) -> None:
        self.model = model

    def get(self, session: Session, obj_id: int) -> ModelT | None:
        return session.get(self.model, obj_id)

    def list(
        self,
        session: Session,
        *,
        offset: int = 0,
        limit: int = 100,
    ) -> Sequence[ModelT]:
        return session.exec(select(self.model).offset(offset).limit(limit)).all()

    def save(self, session: Session, obj: ModelT) -> ModelT:
        """Insert or update — commits and refreshes the instance."""
        session.add(obj)
        session.commit()
        session.refresh(obj)
        return obj

    def delete(self, session: Session, obj: ModelT) -> None:
        session.delete(obj)
        session.commit()
