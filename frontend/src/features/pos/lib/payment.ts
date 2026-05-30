import type { PaymentMethod, TenderInput } from '@/types/payment'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Sum of the bill portions covered so far (Σ amount). */
export function paidTotal(tenders: TenderInput[]): number {
  return round2(tenders.reduce((sum, t) => sum + t.amount, 0))
}

/** What's still owed — never negative (cash overpayment is change, not owed). */
export function remaining(total: number, tenders: TenderInput[]): number {
  return round2(Math.max(0, total - paidTotal(tenders)))
}

/** Cash change owed back = Σ(tendered − amount) over cash tenders. */
export function changeDue(tenders: TenderInput[]): number {
  return round2(
    tenders.reduce(
      (sum, t) => sum + (t.tendered_amount !== undefined ? t.tendered_amount - t.amount : 0),
      0,
    ),
  )
}

/**
 * Append a tender for `entered` on `method`, honouring the backend rule that
 * Σ(amount) must equal the total:
 * - cash: amount = min(entered, remaining); the full `entered` is tendered, so
 *   any excess becomes change.
 * - non-cash: amount is capped at remaining (cards can't be over-charged).
 * No-ops once the bill is fully covered or for a non-positive entry.
 */
export function addTender(
  tenders: TenderInput[],
  method: PaymentMethod,
  entered: number,
  total: number,
  reference?: string,
): TenderInput[] {
  const left = remaining(total, tenders)
  if (left <= 0 || entered <= 0) return tenders
  const amount = round2(Math.min(entered, left))
  if (method === 'cash') {
    return [...tenders, { method, amount, tendered_amount: round2(entered) }]
  }
  return [...tenders, { method, amount, reference: reference?.trim() || undefined }]
}

/** The bill is payable once at least one tender fully covers the total. */
export function canSubmit(total: number, tenders: TenderInput[]): boolean {
  return tenders.length > 0 && remaining(total, tenders) === 0
}
