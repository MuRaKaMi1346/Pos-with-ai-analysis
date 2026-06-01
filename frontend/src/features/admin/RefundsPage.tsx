import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { type RefundCreateInput, useCreateRefund, useRefunds } from '@/features/admin/api/refunds'
import { RefundCreateDialog } from '@/features/admin/components/RefundCreateDialog'
import { formatCurrency } from '@/lib/utils'

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export function RefundsPage() {
  const { data, isPending } = useRefunds()
  const create = useCreateRefund()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleCreate(values: RefundCreateInput): Promise<void> {
    try {
      const refund = await create.mutateAsync(values)
      toast.success(`คืนเงินสำเร็จ ${refund.refund_number}`)
      setDialogOpen(false)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'คืนเงินไม่สำเร็จ')
    }
  }

  const rows = data ?? []

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">การคืนเงิน</h1>
          <p className="text-sm text-text-muted">ประวัติการคืนเงิน และสร้างรายการคืนเงินใหม่</p>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> สร้างการคืนเงิน
        </Button>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">เลขที่คืนเงิน</th>
              <th className="px-4 py-3 font-medium">บิล</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนเงิน</th>
              <th className="px-4 py-3 text-right font-medium">รายการ</th>
              <th className="px-4 py-3 font-medium">เหตุผล</th>
              <th className="px-4 py-3 font-medium">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  ยังไม่มีการคืนเงิน
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium tabular-nums text-text">{r.refund_number}</td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">#{r.order_id}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--color-danger)]">
                    −{formatCurrency(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {r.items.length}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{r.reason ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{fmtTime(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RefundCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(v) => {
          void handleCreate(v)
        }}
        isPending={create.isPending}
      />
    </div>
  )
}
