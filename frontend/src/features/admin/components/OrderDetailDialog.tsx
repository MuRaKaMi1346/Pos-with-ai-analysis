import { ChefHat, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type ApplyDiscountInput,
  useApplyOrderDiscount,
  useOrder,
  useRemoveOrderDiscount,
  useSendToKitchen,
  useVoidItem,
  useVoidOrder,
} from '@/features/admin/api/orders'
import { OrderDiscountDialog } from '@/features/admin/components/OrderDiscountDialog'
import { useProducts } from '@/features/pos/api/products'
import { formatCurrency } from '@/lib/utils'
import { ORDER_STATUS_LABELS, type OrderDetail } from '@/types/orderDetail'

interface Props {
  orderId: number | null
  onOpenChange: (open: boolean) => void
}

function StatusBadge({ status }: { status: OrderDetail['status'] }) {
  const tone =
    status === 'paid'
      ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
      : status === 'voided'
        ? 'bg-surface-2 text-text-muted'
        : status === 'refunded' || status === 'partially_refunded'
          ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
          : 'bg-primary/15 text-primary'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

export function OrderDetailDialog({ orderId, onOpenChange }: Props) {
  const order = useOrder(orderId)
  const products = useProducts()
  const sendToKitchen = useSendToKitchen()
  const voidItem = useVoidItem()
  const voidOrder = useVoidOrder()
  const applyDiscount = useApplyOrderDiscount()
  const removeDiscount = useRemoveOrderDiscount()
  const [discountOpen, setDiscountOpen] = useState(false)

  const productName = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of products.data ?? []) map.set(p.id, p.name)
    return map
  }, [products.data])

  const o = order.data

  function run(p: Promise<unknown>, ok: string): void {
    p.then(() => {
      toast.success(ok)
    }).catch((err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } }
      toast.error(ax.response?.data?.message ?? 'ทำรายการไม่สำเร็จ')
    })
  }

  function handleVoidItem(itemId: number): void {
    if (orderId === null) return
    const reason = window.prompt('เหตุผลในการยกเลิกรายการ:')
    if (!reason) return
    run(voidItem.mutateAsync({ orderId, itemId, reason }), 'ยกเลิกรายการแล้ว')
  }
  function handleVoidOrder(): void {
    if (orderId === null || !o) return
    const reason = window.prompt(`ยกเลิกทั้งบิล ${o.order_number}? ระบุเหตุผล:`)
    if (!reason) return
    run(voidOrder.mutateAsync({ orderId, reason }), 'ยกเลิกบิลแล้ว')
  }
  function handleApplyDiscount(body: ApplyDiscountInput): void {
    if (orderId === null) return
    applyDiscount
      .mutateAsync({ orderId, body })
      .then(() => {
        toast.success('ใช้ส่วนลดแล้ว')
        setDiscountOpen(false)
      })
      .catch((err: unknown) => {
        const ax = err as { response?: { data?: { message?: string } } }
        toast.error(ax.response?.data?.message ?? 'ใช้ส่วนลดไม่สำเร็จ')
      })
  }

  const canSendToKitchen = o && !o.sent_to_kitchen_at && (o.status === 'open' || o.status === 'hold')
  const canEdit = o && (o.status === 'open' || o.status === 'hold')
  const canVoidOrder = o && o.status !== 'voided' && o.status !== 'refunded'

  return (
    <>
      <Dialog open={orderId !== null} onOpenChange={onOpenChange}>
        {orderId !== null && (
          <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {o ? `บิล ${o.order_number}` : 'รายละเอียดบิล'}
                {o && <StatusBadge status={o.status} />}
              </DialogTitle>
              <DialogDescription className="sr-only">รายละเอียดและการจัดการบิล</DialogDescription>
            </DialogHeader>

            {order.isPending ? (
              <p className="py-8 text-center text-sm text-text-muted">กำลังโหลด…</p>
            ) : !o ? (
              <p className="py-8 text-center text-sm text-[var(--color-danger)]">ไม่พบบิล</p>
            ) : (
              <div className="space-y-4">
                {/* Items */}
                <ul className="divide-y divide-border rounded-md border border-border">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        <span className={it.is_voided ? 'text-text-muted line-through' : 'text-text'}>
                          {productName.get(it.product_id) ?? `สินค้า #${it.product_id}`}
                        </span>
                        <span className="ml-2 text-text-muted">
                          ×{it.qty} @ {formatCurrency(it.unit_price)}
                        </span>
                        {it.is_voided && (
                          <span className="ml-2 text-xs text-[var(--color-danger)]">ยกเลิกแล้ว</span>
                        )}
                      </span>
                      {!it.is_voided && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleVoidItem(it.id)
                          }}
                          aria-label={`ยกเลิกรายการ ${productName.get(it.product_id) ?? it.product_id}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Discounts */}
                {o.discounts.length > 0 && (
                  <ul className="space-y-1">
                    {o.discounts.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-1.5 text-sm"
                      >
                        <span className="text-text">{d.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-[var(--color-danger)]">
                            −{formatCurrency(d.amount_off)}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label={`ลบส่วนลด ${d.name}`}
                              className="text-text-muted hover:text-[var(--color-danger)]"
                              onClick={() => {
                                if (orderId !== null)
                                  run(
                                    removeDiscount.mutateAsync({ orderId, orderDiscountId: d.id }),
                                    'ลบส่วนลดแล้ว',
                                  )
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Totals */}
                <dl className="space-y-1 border-t border-border pt-3 text-sm">
                  <Row label="ยอดรวมย่อย" value={formatCurrency(o.subtotal)} />
                  {Number(o.discount_total) > 0 && (
                    <Row label="ส่วนลด" value={`−${formatCurrency(o.discount_total)}`} />
                  )}
                  {Number(o.service_charge) > 0 && (
                    <Row label="ค่าบริการ" value={formatCurrency(o.service_charge)} />
                  )}
                  {Number(o.tax_total) > 0 && <Row label="ภาษี" value={formatCurrency(o.tax_total)} />}
                  <Row label="ยอดสุทธิ" value={formatCurrency(o.total)} strong />
                  <Row label="ชำระแล้ว" value={formatCurrency(o.paid_total)} />
                </dl>

                {o.void_reason && (
                  <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-text-muted">
                    เหตุผลยกเลิก: {o.void_reason}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {canSendToKitchen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (orderId !== null)
                          run(sendToKitchen.mutateAsync(orderId), 'ส่งเข้าครัวแล้ว')
                      }}
                    >
                      <ChefHat className="h-4 w-4" /> ส่งเข้าครัว
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDiscountOpen(true)
                      }}
                    >
                      ลดราคาทั้งบิล
                    </Button>
                  )}
                  {canVoidOrder && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="ml-auto"
                      onClick={handleVoidOrder}
                    >
                      <Trash2 className="h-4 w-4" /> ยกเลิกทั้งบิล
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>

      <OrderDiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        onSubmit={handleApplyDiscount}
        isPending={applyDiscount.isPending}
      />
    </>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold text-text' : 'text-text'}`}>{value}</dd>
    </div>
  )
}
