import { formatCurrency } from '@/lib/utils'
import type { OrderChannel } from '@/types/order'
import type { PaymentMethod } from '@/types/payment'
import type { Receipt } from '@/types/receipt'

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  dine_in: 'ทานที่ร้าน',
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี่',
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'เงินสด',
  qr_promptpay: 'พร้อมเพย์',
  card: 'บัตร',
  other: 'อื่น ๆ',
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** 80mm thermal-style receipt fed by GET /orders/{id}/receipt (spec §5.10). */
export function ReceiptPreview({ receipt }: { receipt: Receipt }) {
  return (
    <div className="mx-auto w-full max-w-[302px] bg-white font-mono text-[11px] leading-tight text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{receipt.store.name}</p>
        {receipt.store.address && <p>{receipt.store.address}</p>}
        {receipt.store.tax_id && <p>เลขประจำตัวผู้เสียภาษี {receipt.store.tax_id}</p>}
      </div>

      <Divider />
      <Row label="บิล" value={receipt.order_number} />
      <Row
        label={`${CHANNEL_LABEL[receipt.channel]}${receipt.table_number ? ` โต๊ะ ${receipt.table_number}` : ''}`}
        value={formatWhen(receipt.created_at)}
      />
      {receipt.cashier_name && <Row label="แคชเชียร์" value={receipt.cashier_name} />}
      {receipt.customer_name && <Row label="ลูกค้า" value={receipt.customer_name} />}

      <Divider />
      {receipt.lines.map((line, i) => (
        <div key={i} className="mb-1">
          <div className="flex justify-between gap-2">
            <span className="min-w-0">
              {line.qty}× {line.product_name}
            </span>
            <span className="shrink-0 tabular-nums">{formatCurrency(line.line_total)}</span>
          </div>
          {line.modifiers.map((m, j) => (
            <div key={j} className="pl-3 text-[10px] text-stone-700">
              + {m.name}
              {Number(m.price_delta) > 0 ? ` (${formatCurrency(m.price_delta)})` : ''}
            </div>
          ))}
        </div>
      ))}

      <Divider />
      <Row label="ยอดรวมย่อย" value={formatCurrency(receipt.subtotal)} />
      {Number(receipt.discount_total) > 0 && (
        <Row label="ส่วนลด" value={`-${formatCurrency(receipt.discount_total)}`} />
      )}
      {Number(receipt.service_charge) > 0 && (
        <Row label="ค่าบริการ" value={formatCurrency(receipt.service_charge)} />
      )}
      {Number(receipt.tax_total) > 0 && (
        <Row
          label={`VAT${receipt.tax_inclusive ? ' (รวมแล้ว)' : ''}`}
          value={formatCurrency(receipt.tax_total)}
        />
      )}
      {Number(receipt.rounding_adjustment) !== 0 && (
        <Row label="ปัดเศษ" value={formatCurrency(receipt.rounding_adjustment)} />
      )}
      <div className="mt-1 flex justify-between text-sm font-bold">
        <span>รวมทั้งสิ้น</span>
        <span className="tabular-nums">{formatCurrency(receipt.total)}</span>
      </div>

      <Divider />
      {receipt.payments.map((p, i) => (
        <Row
          key={i}
          label={`${PAYMENT_LABEL[p.method]}${p.reference ? ` (${p.reference})` : ''}`}
          value={formatCurrency(p.amount)}
        />
      ))}
      {Number(receipt.change_due) > 0 && (
        <Row label="เงินทอน" value={formatCurrency(receipt.change_due)} />
      )}

      {receipt.footer && (
        <>
          <Divider />
          <p className="whitespace-pre-line text-center">{receipt.footer}</p>
        </>
      )}
    </div>
  )
}

function Divider() {
  return <div className="my-1 border-t border-dashed border-stone-400" />
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  )
}
