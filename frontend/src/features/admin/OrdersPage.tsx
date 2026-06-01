import { useMemo, useState } from 'react'

import { useOrders } from '@/features/admin/api/orders'
import { OrderDetailDialog } from '@/features/admin/components/OrderDetailDialog'
import { formatCurrency } from '@/lib/utils'
import type { OrderChannel, OrderStatus } from '@/types/order'
import { ORDER_STATUS_LABELS } from '@/types/orderDetail'

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี่',
}
const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

function statusTone(status: OrderStatus): string {
  if (status === 'paid') return 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
  if (status === 'voided') return 'bg-surface-2 text-text-muted'
  if (status === 'refunded' || status === 'partially_refunded')
    return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
  return 'bg-primary/15 text-primary'
}

export function OrdersPage() {
  const { data, isPending } = useOrders(100)
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [selected, setSelected] = useState<number | null>(null)

  const rows = useMemo(
    () => (data ?? []).filter((o) => status === 'all' || o.status === status),
    [data, status],
  )

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">บิล / ออเดอร์</h1>
          <p className="text-sm text-text-muted">ดูบิลล่าสุด ส่งเข้าครัว ยกเลิก และลดราคา</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="order-status" className="text-xs font-medium text-text-muted">
            สถานะ
          </label>
          <select
            id="order-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus | 'all')
            }}
            className="h-10 w-44 rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">ทั้งหมด</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">เลขที่บิล</th>
              <th className="px-4 py-3 font-medium">ช่องทาง</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">ยอดสุทธิ</th>
              <th className="px-4 py-3 font-medium">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  ไม่มีบิลในเงื่อนไขนี้
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => {
                    setSelected(o.id)
                  }}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-medium tabular-nums text-text">{o.order_number}</td>
                  <td className="px-4 py-3 text-text-muted">{CHANNEL_LABELS[o.channel]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(o.status)}`}
                    >
                      {ORDER_STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text">
                    {formatCurrency(o.total)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{fmtTime(o.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <OrderDetailDialog
        orderId={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
