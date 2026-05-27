"""Recipe repository."""

from collections.abc import Sequence

from sqlmodel import Session, select

from app.models import Recipe
from app.repositories.base import BaseRepository

repository = BaseRepository(Recipe)


def list_for_product(session: Session, product_id: int) -> Sequence[Recipe]:
    return session.exec(select(Recipe).where(Recipe.product_id == product_id)).all()


def get_for_pair(session: Session, *, product_id: int, ingredient_id: int) -> Recipe | None:
    return session.exec(
        select(Recipe)
        .where(Recipe.product_id == product_id)
        .where(Recipe.ingredient_id == ingredient_id)
    ).first()
