import type { ReactNode } from 'react'

import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { formatCurrency } from '@/lib/utils'
import type { PeakHoursCell } from '@/types/dashboard'

const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** Espresso-primary ramp: empty cells fall back to the neutral surface tint. */
function cellBackground(ratio: number): string {
  if (ratio <= 0) return 'var(--color-surface-2)'
  return `oklch(0.55 0.18 35 / ${(0.15 + ratio * 0.85).toFixed(3)})`
}

export function PeakHoursHeatmap({
  data,
  isLoading,
}: {
  data: PeakHoursCell[] | undefined
  isLoading: boolean
}) {
  const cells = data ?? []
  const lookup = new Map<string, PeakHoursCell>()
  let max = 0
  for (const c of cells) {
    lookup.set(`${c.weekday}-${c.hour}`, c)
    const rev = Number(c.revenue)
    if (rev > max) max = rev
  }
  const denom = max === 0 ? 1 : max

  const gridChildren: ReactNode[] = [<div key="corner" />]
  for (let h = 0; h < 24; h++) {
    gridChildren.push(
      <div key={`hour-${h}`} className="text-center text-[10px] text-text-muted">
        {h}
      </div>,
    )
  }
  for (let w = 0; w < 7; w++) {
    gridChildren.push(
      <div key={`label-${w}`} className="pr-2 text-right text-xs text-text-muted">
        {WEEKDAYS_TH[w]}
      </div>,
    )
    for (let h = 0; h < 24; h++) {
      const cell = lookup.get(`${w}-${h}`)
      const rev = cell ? Number(cell.revenue) : 0
      gridChildren.push(
        <div
          key={`${w}-${h}`}
          className="aspect-square rounded-[3px] transition-transform duration-150
                     hover:scale-[1.18] hover:ring-1 hover:ring-text/20
                     motion-reduce:transition-none motion-reduce:hover:scale-100"
          style={{ backgroundColor: cellBackground(rev / denom) }}
          title={
            cell
              ? `${WEEKDAYS_TH[w]} ${h}:00 — ${formatCurrency(rev)} (${cell.order_count} บิล)`
              : `${WEEKDAYS_TH[w]} ${h}:00 — ไม่มีบิล`
          }
        />,
      )
    }
  }

  return (
    <ChartCard
      title="ช่วงเวลาขายดี (วัน × ชั่วโมง)"
      isLoading={isLoading}
      isEmpty={cells.length === 0}
      height={200}
      index={0}
    >
      <div className="overflow-x-auto">
        <div
          className="inline-grid min-w-full gap-1"
          style={{ gridTemplateColumns: '32px repeat(24, minmax(18px, 1fr))' }}
        >
          {gridChildren}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-text-muted">
          <span>น้อย</span>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <span
              key={r}
              aria-hidden
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: cellBackground(r) }}
            />
          ))}
          <span>มาก</span>
        </div>
      </div>
    </ChartCard>
  )
}
