export type PaymentMethod = 'cash' | 'qr_promptpay' | 'card' | 'other'

/** One tender row sent to POST /orders/{id}/pay. Amounts are numbers in the UI
 *  and serialised to 2dp strings on the wire (see usePayOrder). */
export interface TenderInput {
  method: PaymentMethod
  /** Portion of the bill this tender covers. Σ(amount) must equal the total. */
  amount: number
  /** Card last-4 / QR slip ref / free note. Required for card + QR. */
  reference?: string
  /** Cash handed over (≥ amount); the excess becomes change_due. */
  tendered_amount?: number
}
