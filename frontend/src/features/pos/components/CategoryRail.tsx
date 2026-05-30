import { Coffee, LayoutGrid, UtensilsCrossed } from 'lucide-react'
import { type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { Category } from '@/types/product'

interface CategoryRailProps {
  categories: Category[]
  counts: Record<number, number>
  totalCount: number
  selectedId: number | null
  onSelect: (id: number | null) => void
}

/** Sticky left rail. "All" + one entry per category, with live product counts. */
export function CategoryRail({
  categories,
  counts,
  totalCount,
  selectedId,
  onSelect,
}: CategoryRailProps) {
  const ids: (number | null)[] = [null, ...categories.map((c) => c.id)]

  function handleKeyDown(e: KeyboardEvent<HTMLElement>): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const current = ids.indexOf(selectedId)
    const next =
      e.key === 'ArrowDown' ? Math.min(current + 1, ids.length - 1) : Math.max(current - 1, 0)
    onSelect(ids[next] ?? null)
  }

  return (
    <nav
      aria-label="หมวดหมู่"
      onKeyDown={handleKeyDown}
      className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-stone-200 bg-white p-3"
    >
      <RailItem
        icon={<LayoutGrid className="h-5 w-5" />}
        label="ทั้งหมด"
        count={totalCount}
        active={selectedId === null}
        onClick={() => {
          onSelect(null)
        }}
      />
      {categories.map((cat) => (
        <RailItem
          key={cat.id}
          icon={
            cat.default_station === 'kitchen' ? (
              <UtensilsCrossed className="h-5 w-5" />
            ) : (
              <Coffee className="h-5 w-5" />
            )
          }
          label={cat.name}
          count={counts[cat.id] ?? 0}
          active={selectedId === cat.id}
          onClick={() => {
            onSelect(cat.id)
          }}
        />
      ))}
    </nav>
  )
}

function RailItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active
          ? 'bg-amber-500/15 text-amber-900 ring-1 ring-amber-300'
          : 'text-stone-600 hover:bg-stone-100',
      )}
    >
      <span
        className={cn(
          'shrink-0',
          active ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600',
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs tabular-nums',
          active ? 'bg-amber-500/20 text-amber-800' : 'bg-stone-100 text-stone-500',
        )}
      >
        {count}
      </span>
    </button>
  )
}
