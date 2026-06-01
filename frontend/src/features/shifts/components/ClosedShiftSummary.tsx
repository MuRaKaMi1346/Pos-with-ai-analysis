import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import type { Shift } from '@/types/shift'

/** Post-close summary: expected vs counted cash + the variance (spec §5.11). */
export function ClosedShiftSummary({ shift, onReset }: { shift: Shift; onReset: () => void }) {
  const variance = Number(shift.cash_variance ?? '0')
  const varianceLabel = variance === 0 ? ' (ตรง)' : variance > 0 ? ' (เกิน)' : ' (ขาด)'

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-text">ปิดกะเรียบร้อย</h1>
        <p className="text-sm text-text-muted">สรุปยอดเงินสดของกะนี้</p>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <Row label="เงินตั้งต้น" value={formatCurrency(shift.opening_float)} />
        <Row label="เงินที่ควรมี" value={formatCurrency(shift.expected_cash ?? '0')} />
        <Row label="เงินที่นับได้" value={formatCurrency(shift.closing_cash_counted ?? '0')} />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-semibold">
          <span>ส่วนต่าง</span>
          <span
            className={cn(
              'tabular-nums',
              variance === 0 ? 'text-text' : variance > 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {variance > 0 ? '+' : ''}
            {formatCurrency(shift.cash_variance ?? '0')}
            {varianceLabel}
          </span>
        </div>
      </div>
      <Button variant="outline" size="lg" className="h-12" onClick={onReset}>
        เปิดกะใหม่
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
