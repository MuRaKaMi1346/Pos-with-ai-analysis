"""ModifierGroup CRUD + nested-modifier seeding.

POST creates a group and (optionally) its modifiers in one go so the admin
can build a full set in a single call. Individual-modifier edits are
deferred to a later milestone.
"""

from collections.abc import Sequence

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models import Modifier, ModifierGroup
from app.repositories import modifier_group_repo
from app.schemas.modifier import (
    ModifierGroupCreate,
    ModifierGroupUpdate,
)


def list_all(session: Session) -> Sequence[ModifierGroup]:
    return modifier_group_repo.list_all(session)


def get_or_404(session: Session, group_id: int) -> ModifierGroup:
    group = modifier_group_repo.repository.get(session, group_id)
    if group is None:
        raise NotFoundError("modifier_group_not_found")
    return group


def create(session: Session, data: ModifierGroupCreate) -> ModifierGroup:
    if data.max_select < data.min_select:
        raise ValidationError("max_select_less_than_min_select")
    if modifier_group_repo.get_by_name(session, data.name) is not None:
        raise ConflictError("modifier_group_name_exists")

    group = ModifierGroup(
        name=data.name,
        min_select=data.min_select,
        max_select=data.max_select,
        is_required=data.is_required,
        sort_order=data.sort_order,
    )
    session.add(group)
    session.flush()  # populate group.id
    assert group.id is not None

    for mod_in in data.modifiers:
        session.add(
            Modifier(
                group_id=group.id,
                name=mod_in.name,
                price_delta=mod_in.price_delta,
                sort_order=mod_in.sort_order,
                is_active=mod_in.is_active,
            )
        )

    session.commit()
    session.refresh(group)
    return group


def update(session: Session, group_id: int, data: ModifierGroupUpdate) -> ModifierGroup:
    group = get_or_404(session, group_id)

    fields = data.model_dump(exclude_unset=True)
    new_min = fields.get("min_select", group.min_select)
    new_max = fields.get("max_select", group.max_select)
    if new_max < new_min:
        raise ValidationError("max_select_less_than_min_select")

    if "name" in fields and fields["name"] != group.name:
        clash = modifier_group_repo.get_by_name(session, fields["name"])
        if clash is not None and clash.id != group.id:
            raise ConflictError("modifier_group_name_exists")

    for key, value in fields.items():
        setattr(group, key, value)
    return modifier_group_repo.repository.save(session, group)


def delete(session: Session, group_id: int) -> None:
    """Refuse to delete if any modifier still belongs to this group."""
    group = get_or_404(session, group_id)
    if group.modifiers:
        raise ConflictError("modifier_group_has_modifiers")
    modifier_group_repo.repository.delete(session, group)
