/** Customer as used by the POS (subset of the M7 CustomerRead payload). */
export interface Customer {
  id: number
  code: string
  name: string
  phone: string | null
  loyalty_points: number
  /** Parked loyalty discount applied to the next bill (Decimal string). */
  pending_redemption_baht: string
}
