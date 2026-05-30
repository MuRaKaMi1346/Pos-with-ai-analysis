import { ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateOrder, useHoldOrder, usePayOrder } from '@/features/pos/api/products'
import { useSettings } from '@/features/pos/api/settings'
import { CartLineSheet } from '@/features/pos/components/CartLineSheet'
import { ModifierDialog } from '@/features/pos/components/ModifierDialog'
import { PaymentDialog, type PaymentResult } from '@/features/pos/components/PaymentDialog'
import { TicketLineRow } from '@/features/pos/components/TicketLineRow'
import { computeTicketTotals } from '@/features/pos/lib/ticketTotals'
import {
  ticketCount,
  ticketSubtotal,
  useCartStore,
  type TicketLine,
} from '@/features/pos/stores/cartStore'
import { cn, formatCurrency } from '@/lib/utils'
import type { TenderInput } from '@/types/payment'

/** Receipt-style ticket panel: lines, totals breakdown, Hold + Charge (spec §5.4). */
export function Cart() {
  const lines = useCartStore((s) => s.lines)
  const channel = useCartStore((s) => s.channel)
  const tableNumber = useCartStore((s) => s.tableNumber)
  const updateLine = useCartStore((s) => s.updateLine)
  const clear = useCartStore((s) => s.clear)

  const { data: settings } = useSettings()
  const createOrder = useCreateOrder()
  const payOrder = usePayOrder()
  const holdOrder = useHoldOrder()

  const [sheetUid, setSheetUid] = useState<string | null>(null)
  const [editLine, setEditLine] = useState<TicketLine | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentKey, setPaymentKey] = useState('')

  const subtotal = useMemo(() => ticketSubtotal(lines), [lines])
  const count = ticketCount(lines)
  const totals = settings ? computeTicketTotals(subtotal, settings) : null
  const sheetLine = lines.find((l) => l.uid === sheetUid) ?? null

  function openPayment(): void {
    setPaymentKey(crypto.randomUUID())
    setPaymentOpen(true)
  }

  function buildCreatePayload() {
    return {
      items: lines.map((l) => ({
        product_id: l.product.id,
        qty: l.qty,
        modifier_ids: l.modifiers.map((m) => m.modifier_id),
      })),
      channel,
      table_number: channel === 'dine_in' ? tableNumber.trim() || null : null,
    }
  }

  // Create the bill only when payment is confirmed, then settle it — so closing
  // the dialog mid-entry never leaves an orphan order behind.
  async function handlePaymentSubmit(tenders: TenderInput[]): Promise<PaymentResult> {
    const order = await createOrder.mutateAsync(buildCreatePayload())
    const paid = await payOrder.mutateAsync({
      orderId: order.id,
      tenders,
      idempotencyKey: paymentKey,
    })
    return { orderNumber: paid.order_number, changeDue: Number(paid.change_due) }
  }

  function handlePaymentDone(): void {
    clear()
    setPaymentOpen(false)
  }

  // Park the current ticket as a HOLD bill for later resume (spec §5.6).
  async function handleHold(): Promise<void> {
    if (lines.length === 0) return
    try {
      const order = await createOrder.mutateAsync(buildCreatePayload())
      await holdOrder.mutateAsync(order.id)
      toast.success(`พักบิล ${order.order_number} แล้ว`)
      clear()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'พักบิลไม่สำเร็จ')
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>ตะกร้า</span>
          <span className="text-sm font-normal tabular-nums text-stone-500">{count} รายการ</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pt-0">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm text-stone-400">
            <ShoppingCart className="h-8 w-8" />
            เลือกเมนูเพื่อเริ่มการขาย
          </div>
        ) : (
          <div>
            {lines.map((line) => (
              <TicketLineRow
                key={line.uid}
                line={line}
                onClick={() => {
                  setSheetUid(line.uid)
                }}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="shrink-0 flex-col gap-3 border-t border-stone-100 pt-4">
        <div className="w-full space-y-1 text-sm">
          <TotalRow label="ยอดรวมย่อย" value={formatCurrency(subtotal)} />
          {settings && totals && totals.serviceCharge > 0 && (
            <TotalRow
              label={`ค่าบริการ (${pct(settings.service_charge_rate)})`}
              value={formatCurrency(totals.serviceCharge)}
            />
          )}
          {settings && totals && totals.taxTotal > 0 && (
            <TotalRow
              label={`VAT (${pct(settings.vat_rate)}) ${settings.tax_inclusive ? 'รวมแล้ว' : 'เพิ่ม'}`}
              value={formatCurrency(totals.taxTotal)}
              muted={settings.tax_inclusive}
            />
          )}
        </div>
        <div className="flex w-full items-center justify-between border-t border-stone-100 pt-2">
          <span className="text-sm font-medium text-stone-600">รวมทั้งสิ้น</span>
          <span className="text-3xl font-bold tabular-nums text-stone-900">
            {formatCurrency(totals ? totals.total : subtotal)}
          </span>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            disabled={lines.length === 0 || createOrder.isPending || holdOrder.isPending}
            onClick={handleHold}
            className="h-12"
          >
            พักบิล
          </Button>
          <Button
            size="lg"
            className="h-12"
            disabled={lines.length === 0 || !settings}
            onClick={openPayment}
          >
            ชำระเงิน
          </Button>
        </div>
      </CardFooter>

      <CartLineSheet
        line={sheetLine}
        open={sheetUid !== null}
        onOpenChange={(o) => {
          if (!o) setSheetUid(null)
        }}
        onEditOptions={(line) => {
          setSheetUid(null)
          setEditLine(line)
        }}
      />
      <ModifierDialog
        product={editLine?.product ?? null}
        open={editLine !== null}
        initial={editLine ? { modifiers: editLine.modifiers, note: editLine.note } : undefined}
        confirmLabel="บันทึก"
        onOpenChange={(o) => {
          if (!o) setEditLine(null)
        }}
        onConfirm={(modifiers, note) => {
          if (editLine) updateLine(editLine.uid, { modifiers, note })
          setEditLine(null)
        }}
      />
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={totals ? totals.total : subtotal}
        onSubmit={handlePaymentSubmit}
        onDone={handlePaymentDone}
      />
    </Card>
  )
}

function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-500">{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-stone-400' : 'text-stone-700')}>
        {value}
      </span>
    </div>
  )
}

function pct(rate: string): string {
  return `${(Number(rate) * 100).toFixed(0)}%`
}
