import { Check, QrCode, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keypad } from '@/components/ui/keypad'
import { ReceiptPreview } from '@/features/pos/components/ReceiptPreview'
import { ReceiptPrintLayer } from '@/features/pos/components/ReceiptPrintLayer'
import { addTender, canSubmit, changeDue, paidTotal, remaining } from '@/features/pos/lib/payment'
import { cn, formatCurrency } from '@/lib/utils'
import type { PaymentMethod, TenderInput } from '@/types/payment'
import type { Receipt } from '@/types/receipt'

export interface PaymentResult {
  orderNumber: string
  changeDue: number
  /** Receipt for the preview + print (null if the fetch failed). */
  receipt: Receipt | null
}

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onSubmit: (tenders: TenderInput[]) => Promise<PaymentResult>
  /** "New sale" on the success screen — clears the ticket + closes. */
  onDone: () => void
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'เงินสด' },
  { value: 'qr_promptpay', label: 'พร้อมเพย์' },
  { value: 'card', label: 'บัตร' },
  { value: 'other', label: 'อื่น ๆ' },
]

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'เงินสด',
  qr_promptpay: 'พร้อมเพย์',
  card: 'บัตร',
  other: 'อื่น ๆ',
}

const CASH_CHIPS = [100, 500, 1000]

/** Multi-tender payment flow with live change due (spec §5.5). Fresh per open. */
export function PaymentDialog({ open, onOpenChange, total, onSubmit, onDone }: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PaymentDialogBody total={total} onSubmit={onSubmit} onDone={onDone} />}
    </Dialog>
  )
}

function PaymentDialogBody({
  total,
  onSubmit,
  onDone,
}: Pick<PaymentDialogProps, 'total' | 'onSubmit' | 'onDone'>) {
  const [tenders, setTenders] = useState<TenderInput[]>([])
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [entry, setEntry] = useState('')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  const paid = paidTotal(tenders)
  const left = remaining(total, tenders)
  const change = changeDue(tenders)
  const entered = Number(entry) || 0
  const requireRef = method === 'card' || method === 'qr_promptpay'

  function switchMethod(next: PaymentMethod): void {
    setMethod(next)
    setReference('')
    setEntry(next === 'cash' ? '' : left > 0 ? String(left) : '')
  }

  function commitTender(): void {
    setTenders((prev) => addTender(prev, method, entered, total, reference))
    setEntry('')
    setReference('')
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true)
    try {
      setResult(await onSubmit(tenders))
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'ชำระเงินไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return <PaymentSuccess result={result} total={total} onDone={onDone} />
  }

  const addDisabled = left <= 0 || entered <= 0 || (requireRef && reference.trim() === '')

  return (
    <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden">
      <DialogHeader>
        <DialogTitle>ชำระเงิน</DialogTitle>
        <DialogDescription className="sr-only">เลือกวิธีชำระและเพิ่มยอดจนครบ</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-3 text-center">
        <Summary label="ยอดที่ต้องชำระ" value={formatCurrency(total)} />
        <Summary label="คงเหลือ" value={formatCurrency(left)} strong={left > 0} />
        <Summary label="เงินทอน" value={formatCurrency(change)} muted={change === 0} />
      </div>

      <div
        className="flex gap-1 rounded-lg bg-surface-2 p-1"
        role="group"
        aria-label="วิธีชำระเงิน"
      >
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={method === m.value}
            onClick={() => {
              switchMethod(m.value)
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              method === m.value
                ? 'bg-surface text-text shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {method === 'cash' ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border px-3 py-2 text-right text-2xl font-semibold tabular-nums">
                ฿{entry || '0'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CASH_CHIPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setEntry(String(c))
                    }}
                    className="rounded-lg border border-border py-2 text-sm font-medium hover:bg-surface-2"
                  >
                    ฿{c.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setEntry(left > 0 ? String(left) : '')
                  }}
                  className="rounded-lg border border-primary/40 bg-primary/10 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  พอดี
                </button>
              </div>
            </div>
            <Keypad value={entry} onChange={setEntry} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {method === 'qr_promptpay' && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-6 text-center">
                <QrCode className="h-12 w-12 text-text-muted" />
                <p className="px-4 text-xs text-text-muted">
                  QR พร้อมเพย์จะแสดงเมื่อตั้งค่า PromptPay ID ของร้าน — ยืนยันสลิปแล้วกด
                  “ทำเครื่องหมายว่าชำระแล้ว”
                </p>
              </div>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text-muted">จำนวนเงิน</span>
              <input
                type="number"
                inputMode="decimal"
                value={entry}
                onChange={(e) => {
                  setEntry(e.target.value)
                }}
                className="h-11 rounded-lg border border-border px-3 text-right text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text-muted">
                {method === 'card'
                  ? 'เลขท้ายบัตร 4 หลัก'
                  : method === 'qr_promptpay'
                    ? 'เลขอ้างอิงสลิป'
                    : 'หมายเหตุ'}
                {requireRef && <span className="text-red-500"> *</span>}
              </span>
              <input
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value)
                }}
                maxLength={100}
                className="h-11 rounded-lg border border-border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
          </div>
        )}
      </div>

      <Button variant="outline" disabled={addDisabled} onClick={commitTender}>
        {method === 'qr_promptpay' ? 'ทำเครื่องหมายว่าชำระแล้ว' : 'เพิ่มรายการชำระ'}
      </Button>

      {tenders.length > 0 && (
        <ul className="flex flex-col gap-1">
          {tenders.map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              <span className="font-medium text-text">
                {METHOD_LABEL[t.method]}
                {t.reference && <span className="text-text-muted"> · {t.reference}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatCurrency(t.amount)}</span>
                <button
                  type="button"
                  aria-label="ลบรายการชำระ"
                  onClick={() => {
                    setTenders((prev) => prev.filter((_, idx) => idx !== i))
                  }}
                  className="text-text-muted hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button
        size="lg"
        className="h-12"
        disabled={!canSubmit(total, tenders) || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'กำลังชำระ…' : `ยืนยันการชำระเงิน · ${formatCurrency(paid)}`}
      </Button>
    </DialogContent>
  )
}

function Summary({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
      <span
        className={cn(
          'text-lg font-semibold tabular-nums',
          strong ? 'text-primary' : muted ? 'text-text-muted' : 'text-text',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function PaymentSuccess({
  result,
  total,
  onDone,
}: {
  result: PaymentResult
  total: number
  onDone: () => void
}) {
  return (
    <>
      <DialogContent className="flex max-h-[90vh] w-full max-w-md flex-col items-center gap-4 overflow-y-auto text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
          <Check className="h-8 w-8" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-lg font-semibold text-text">ชำระเงินสำเร็จ</DialogTitle>
          <DialogDescription className="text-sm tabular-nums text-text-muted">
            บิล {result.orderNumber} · {formatCurrency(total)}
          </DialogDescription>
        </div>
        {result.changeDue > 0 && (
          <div className="w-full rounded-lg bg-primary/10 py-3">
            <p className="text-xs uppercase tracking-wide text-primary">เงินทอน</p>
            <p className="text-3xl font-bold tabular-nums text-primary">
              {formatCurrency(result.changeDue)}
            </p>
          </div>
        )}
        {result.receipt && (
          <div className="w-full overflow-y-auto rounded-lg border border-border p-3">
            <ReceiptPreview receipt={result.receipt} />
          </div>
        )}
        <div className="grid w-full grid-cols-3 gap-2">
          <Button
            variant="outline"
            disabled={!result.receipt}
            onClick={() => {
              window.print()
            }}
          >
            พิมพ์
          </Button>
          <Button variant="outline" disabled title="อีเมลใบเสร็จ (เร็ว ๆ นี้)">
            อีเมล
          </Button>
          <Button onClick={onDone}>ขายใหม่</Button>
        </div>
      </DialogContent>
      {result.receipt && <ReceiptPrintLayer receipt={result.receipt} />}
    </>
  )
}
