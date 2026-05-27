import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import type { PeakHoursCell } from '@/types/dashboard'

const WEEKDAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function intensityClass(ratio: number): string {
  if (ratio === 0) return 'bg-slate-100'
  if (ratio < 0.25) return 'bg-blue-100'
  if (ratio < 0.5) return 'bg-blue-300'
  if (ratio < 0.75) return 'bg-blue-500'
  return 'bg-blue-700'
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

  const gridChildren: React.ReactNode[] = [<div key="corner" />]
  for (let h = 0; h < 24; h++) {
    gridChildren.push(
      <div key={`hour-${h}`} className="text-center text-[10px] text-slate-500">
        {h}
      </div>,
    )
  }
  for (let w = 0; w < 7; w++) {
    gridChildren.push(
      <div key={`label-${w}`} className="pr-2 text-right text-xs text-slate-500">
        {WEEKDAYS_TH[w]}
      </div>,
    )
    for (let h = 0; h < 24; h++) {
      const cell = lookup.get(`${w}-${h}`)
      const rev = cell ? Number(cell.revenue) : 0
      gridChildren.push(
        <div
          key={`${w}-${h}`}
          className={cn('aspect-square rounded-sm', intensityClass(rev / denom))}
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
    <Card>
      <CardHeader>
        <CardTitle>ช่วงเวลาขายดี (วัน × ชั่วโมง)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-slate-500">กำลังโหลด…</div>
        ) : (
          <div
            className="inline-grid min-w-full gap-1"
            style={{ gridTemplateColumns: '32px repeat(24, minmax(18px, 1fr))' }}
          >
            {gridChildren}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
