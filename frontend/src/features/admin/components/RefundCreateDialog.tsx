import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type RefundCreateInput, useOrderLookup } from '@/features/admin/api/refunds'
import { useProducts } from '@/features/pos/api/products'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RefundCreateInput) => void
  isPending?: boolean
}

interface LineSel {
  qty: number
  restock: boolean
}

const FIELD = 'h-10'

export function RefundCreateDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mount the body only while open so its state resets each time. */}
      {open && (
        <RefundCreateBody onOpenChange={onOpenChange} onSubmit={onSubmit} isPending={isPending} />
      )}
    </Dialog>
  )
}

function RefundCreateBody({ onOpenChange, onSubmit, isPending }: Omit<Props, 'open'>) {
  const [orderText, setOrderText] = useState('')
  const [reason, setReason] = useState('')
  const [sel, setSel] = useState<Record<number, LineSel>>({})

  const orderId = /^\d+$/.test(orderText.trim()) ? Number(orderText.trim()) : null
  const order = useOrderLookup(orderId)
  const products = useProducts()

  const productName = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of products.data ?? []) map.set(p.id, p.name)
    return map
  }, [products.data])

  const items = order.data?.items ?? []
  // Stale entries from a previous lookup are ignored — we only map current items.
  const chosen: RefundCreateInput['items'] = items.flatMap((it) => {
    const line = sel[it.id]
    return line && line.qty > 0
      ? [{ order_item_id: it.id, qty: line.qty, restock: line.restock }]
      : []
  })
  const canSubmit = orderId !== null && chosen.length > 0

  function setLine(itemId: number, patch: Partial<LineSel>): void {
    setSel((s) => ({ ...s, [itemId]: { qty: 0, restock: true, ...s[itemId], ...patch } }))
  }

  function submit(): void {
    if (!canSubmit || orderId === null) return
    onSubmit({ order_id: orderId, items: chosen, reason: reason.trim() || null })
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>สร้างการคืนเงิน</DialogTitle>
        <DialogDescription>ใส่หมายเลขบิล (order id) แล้วเลือกจำนวนที่จะคืนในแต่ละรายการ</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="refund-order">หมายเลขบิล (order id)</Label>
          <Input
            id="refund-order"
            type="number"
            min={1}
            autoFocus
            className={FIELD}
            value={orderText}
            onChange={(e) => {
              setOrderText(e.target.value)
            }}
          />
        </div>

        {orderId !== null && order.isPending && <p className="text-sm text-text-muted">กำลังค้นหาบิล…</p>}
        {orderId !== null && order.isError && (
          <p className="text-sm text-[var(--color-danger)]">ไม่พบบิลนี้</p>
        )}

        {order.data && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text">บิล {order.data.order_number}</span>
              <span className="text-text-muted">
                สถานะ: {order.data.status} · รวม {formatCurrency(order.data.total)}
              </span>
            </div>
            {order.data.status !== 'paid' && order.data.status !== 'partially_refunded' && (
              <p className="rounded-md bg-[var(--color-warning)]/15 px-3 py-2 text-xs text-[var(--color-warning)]">
                คืนเงินได้เฉพาะบิลที่ชำระแล้ว — ระบบจะตรวจสอบอีกครั้งเมื่อยืนยัน
              </p>
            )}

            <ul className="divide-y divide-border rounded-md border border-border">
              {items.map((it) => {
                const line = sel[it.id] ?? { qty: 0, restock: true }
                return (
                  <li key={it.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-text">
                      {productName.get(it.product_id) ?? `สินค้า #${it.product_id}`}
                      <span className="ml-2 text-text-muted">
                        ×{it.qty} @ {formatCurrency(it.unit_price)}
                      </span>
                    </span>
                    <label className="flex items-center gap-1 text-xs text-text-muted">
                      คืน
                      <Input
                        type="number"
                        min={0}
                        max={it.qty}
                        aria-label="จำนวนที่คืน"
                        value={line.qty}
                        onChange={(e) => {
                          setLine(it.id, {
                            qty: Math.max(0, Math.min(it.qty, Number(e.target.value) || 0)),
                          })
                        }}
                        className="h-9 w-16"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={line.restock}
                        onChange={(e) => {
                          setLine(it.id, { restock: e.target.checked })
                        }}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      คืนสต็อก
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">เหตุผล (ไม่บังคับ)</Label>
              <Input
                id="refund-reason"
                className={FIELD}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                }}
              />
            </div>
          </>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onOpenChange(false)
          }}
        >
          ยกเลิก
        </Button>
        <Button type="button" disabled={!canSubmit || isPending} onClick={submit}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          ยืนยันคืนเงิน
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
