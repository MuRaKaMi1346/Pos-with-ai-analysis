import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency } from '@/lib/utils'
import type { Order, OrderChannel } from '@/types/order'

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี่',
}

interface HeldTicketsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  isPending: boolean
  resumingId: number | null
  onResume: (order: Order) => void
}

/** Right-side drawer listing parked (HOLD) bills — tap to resume (spec §5.6). */
export function HeldTicketsDrawer({
  open,
  onOpenChange,
  orders,
  isPending,
  resumingId,
  onResume,
}: HeldTicketsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && (
        <SheetContent>
          <SheetHeader>
            <SheetTitle>บิลที่พักไว้ ({orders.length})</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isPending ? (
              <p className="py-8 text-center text-sm text-stone-500">กำลังโหลด…</p>
            ) : orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-400">ไม่มีบิลที่พักไว้</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {orders.map((order) => (
                  <li key={order.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold tabular-nums text-stone-800">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-stone-500">
                          {CHANNEL_LABEL[order.channel]}
                          {order.table_number ? ` · โต๊ะ ${order.table_number}` : ''} ·{' '}
                          {formatAge(order.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      disabled={resumingId !== null}
                      onClick={() => {
                        onResume(order)
                      }}
                    >
                      {resumingId === order.id ? 'กำลังเรียกคืน…' : 'เรียกคืนบิล'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  )
}

/** Coarse "time since" label. Assumes an ISO timestamp; clamps negatives to now. */
function formatAge(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาที`
  return `${Math.floor(minutes / 60)} ชม.`
}
