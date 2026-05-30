import { describe, expect, it } from 'vitest'

import {
  canConfirmSelection,
  groupCount,
  isGroupSatisfied,
  selectedModifiers,
  toggleModifier,
} from '@/features/pos/lib/modifierSelection'
import type { ModifierGroup, ModifierOption } from '@/types/modifier'

function option(id: number, name: string, delta = '0.00'): ModifierOption {
  return { id, name, price_delta: delta, sort_order: id, is_active: true }
}

const sizeGroup: ModifierGroup = {
  id: 1,
  name: 'Size',
  min_select: 1,
  max_select: 1,
  is_required: true,
  sort_order: 0,
  modifiers: [option(1, 'S'), option(2, 'M'), option(3, 'L')],
}
const extrasGroup: ModifierGroup = {
  id: 2,
  name: 'Extras',
  min_select: 0,
  max_select: 2,
  is_required: false,
  sort_order: 1,
  modifiers: [
    option(10, 'Extra shot', '10.00'),
    option(11, 'Oat', '15.00'),
    option(12, 'Whip', '5.00'),
  ],
}

describe('toggleModifier', () => {
  it('radio (max_select 1) replaces the group selection', () => {
    let sel = toggleModifier(sizeGroup, [], 1)
    expect(sel).toEqual([1])
    sel = toggleModifier(sizeGroup, sel, 2)
    expect(sel).toEqual([2])
  })

  it('checkbox toggles and respects max_select', () => {
    let sel = toggleModifier(extrasGroup, [], 10)
    sel = toggleModifier(extrasGroup, sel, 11)
    expect(sel).toEqual([10, 11])
    sel = toggleModifier(extrasGroup, sel, 12) // at max 2 → ignored
    expect(sel).toEqual([10, 11])
    sel = toggleModifier(extrasGroup, sel, 10) // toggle off
    expect(sel).toEqual([11])
  })

  it('radio leaves other groups untouched', () => {
    const sel = toggleModifier(sizeGroup, [10], 2)
    expect([...sel].sort((a, b) => a - b)).toEqual([2, 10])
  })
})

describe('groupCount / isGroupSatisfied', () => {
  it('counts only ids belonging to the group', () => {
    expect(groupCount(sizeGroup, [1, 10, 11])).toBe(1)
    expect(groupCount(extrasGroup, [1, 10, 11])).toBe(2)
  })

  it('a required group needs a selection', () => {
    expect(isGroupSatisfied(sizeGroup, [])).toBe(false)
    expect(isGroupSatisfied(sizeGroup, [1])).toBe(true)
  })

  it('an optional group is satisfied empty and within max', () => {
    expect(isGroupSatisfied(extrasGroup, [])).toBe(true)
    expect(isGroupSatisfied(extrasGroup, [10, 11])).toBe(true)
  })
})

describe('canConfirmSelection', () => {
  it('is false until every required group is satisfied', () => {
    const groups = [sizeGroup, extrasGroup]
    expect(canConfirmSelection(groups, [])).toBe(false)
    expect(canConfirmSelection(groups, [1])).toBe(true)
    expect(canConfirmSelection(groups, [1, 10])).toBe(true)
  })
})

describe('selectedModifiers', () => {
  it('projects ids into ordered SelectedModifier snapshots', () => {
    expect(selectedModifiers([sizeGroup, extrasGroup], [11, 2])).toEqual([
      { modifier_id: 2, name: 'M', price_delta: 0 },
      { modifier_id: 11, name: 'Oat', price_delta: 15 },
    ])
  })
})
