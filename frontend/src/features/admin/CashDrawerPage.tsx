import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type CashMovementInput,
  useCashMovements,
  useRecordCashMovement,
} from '@/features/admin/api/cashDrawer'
import { CashMovementDialog } from '@/features/admin/components/CashMovementDialog'
import { formatCurrency } from '@/lib/utils'
import { CASH_MOVEMENT_LABELS } from '@/types/cash'

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export function CashDrawerPage() {
  const movements = useCashMovements()
  const record = useRecordCashMovement()
  const [dialogOpen, setDialogOpen] = useState(false)

  // The endpoint 404s when no shift is open — treat that as "needs a shift".
  const noOpenShift = movements.isError
  const rows = movements.data ?? []

  async function handleRecord(values: CashMovementInput): Promise<void> {
    try {
      await record.mutateAsync(values)
      toast.success('บันทึกการเคลื่อนไหวแล้ว')
      setDialogOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ (ต้องมีกะที่เปิดอยู่)')
    }
  }

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">ลิ้นชักเงินสด</h1>
          <p className="text-sm text-text-muted">บันทึกและดูเงินเข้า/ออกของกะที่เปิดอยู่</p>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true)
          }}
          disabled={noOpenShift}
        >
          <Plus className="h-4 w-4" /> บันทึกเงินเข้า/ออก
        </Button>
      </header>

      {noOpenShift ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-muted">
          ยังไม่มีกะที่เปิดอยู่ — เปิดกะที่หน้า “กะ” ก่อนเพื่อบันทึกเงินเข้า/ออก
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">เหตุผล</th>
              </tr>
            </thead>
            <tbody>
              {movements.isPending ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                    กำลังโหลด…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                    ยังไม่มีการเคลื่อนไหวในกะนี้
                  </td>
                </tr>
              ) : (
                rows.map((m) => {
                  const isIn = m.type === 'pay_in'
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 tabular-nums text-text-muted">{fmtTime(m.created_at)}</td>
                      <td className="px-4 py-3 text-text">{CASH_MOVEMENT_LABELS[m.type]}</td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          isIn ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {isIn ? '+' : '−'}
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{m.reason ?? '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <CashMovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(v) => {
          void handleRecord(v)
        }}
        isPending={record.isPending}
      />
    </div>
  )
}
