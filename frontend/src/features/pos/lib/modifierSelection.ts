import type { ModifierGroup, ModifierOption } from '@/types/modifier'
import type { SelectedModifier } from '@/features/pos/stores/cartStore'

/** Selection is a flat list of chosen modifier ids across all groups. */
function groupIds(group: ModifierGroup): Set<number> {
  return new Set(group.modifiers.map((m) => m.id))
}

/** How many of the current selection belong to this group. */
export function groupCount(group: ModifierGroup, selected: number[]): number {
  const ids = groupIds(group)
  return selected.filter((id) => ids.has(id)).length
}

/**
 * Apply a tap on a modifier under its group's rules:
 * - `max_select <= 1` → radio: the tapped option replaces the group's pick.
 * - `max_select > 1`  → checkbox: toggle; additions past `max_select` are ignored.
 */
export function toggleModifier(
  group: ModifierGroup,
  selected: number[],
  modifierId: number,
): number[] {
  const ids = groupIds(group)
  if (group.max_select <= 1) {
    return [...selected.filter((id) => !ids.has(id)), modifierId]
  }
  if (selected.includes(modifierId)) {
    return selected.filter((id) => id !== modifierId)
  }
  if (groupCount(group, selected) >= group.max_select) {
    return selected
  }
  return [...selected, modifierId]
}

/** A required group needs ≥1 (or its min); optional needs ≥ min and ≤ max. */
export function isGroupSatisfied(group: ModifierGroup, selected: number[]): boolean {
  const count = groupCount(group, selected)
  const min = group.is_required ? Math.max(1, group.min_select) : group.min_select
  return count >= min && count <= group.max_select
}

/** Every group's selection must satisfy its min/max before a line can be added. */
export function canConfirmSelection(groups: ModifierGroup[], selected: number[]): boolean {
  return groups.every((g) => isGroupSatisfied(g, selected))
}

/**
 * Project the flat id selection back into ordered `SelectedModifier`s, walking
 * groups + options in display order so the cart line reads predictably.
 */
export function selectedModifiers(groups: ModifierGroup[], selected: number[]): SelectedModifier[] {
  const chosen = new Set(selected)
  const result: SelectedModifier[] = []
  for (const group of groups) {
    for (const option of group.modifiers) {
      if (chosen.has(option.id)) {
        result.push(optionToSelected(option))
      }
    }
  }
  return result
}

function optionToSelected(option: ModifierOption): SelectedModifier {
  return { modifier_id: option.id, name: option.name, price_delta: Number(option.price_delta) }
}
