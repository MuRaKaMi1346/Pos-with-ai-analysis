import { groupCount } from '@/features/pos/lib/modifierSelection'
import { cn, formatCurrency } from '@/lib/utils'
import type { ModifierGroup } from '@/types/modifier'

interface ModifierPickerProps {
  groups: ModifierGroup[]
  selectedIds: number[]
  onToggle: (group: ModifierGroup, modifierId: number) => void
}

/** Pure presentational picker: radio when `max_select === 1`, else checkboxes. */
export function ModifierPicker({ groups, selectedIds, onToggle }: ModifierPickerProps) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const isMulti = group.max_select > 1
        const atMax = isMulti && groupCount(group, selectedIds) >= group.max_select
        return (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="mb-1 flex w-full items-center justify-between">
              <span className="text-sm font-semibold text-stone-800">{group.name}</span>
              {group.is_required ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  จำเป็น
                </span>
              ) : (
                <span className="text-[10px] text-stone-400">
                  {isMulti ? `เลือกได้ถึง ${group.max_select}` : 'เลือกได้ 1'}
                </span>
              )}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {group.modifiers.map((m) => {
                const selected = selectedIds.includes(m.id)
                const disabled = !selected && atMax
                return (
                  <button
                    key={m.id}
                    type="button"
                    role={isMulti ? 'checkbox' : 'radio'}
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => {
                      onToggle(group, m.id)
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50',
                      disabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <span className="truncate">{m.name}</span>
                    {Number(m.price_delta) > 0 && (
                      <span className="shrink-0 text-xs tabular-nums text-stone-500">
                        +{formatCurrency(m.price_delta)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
