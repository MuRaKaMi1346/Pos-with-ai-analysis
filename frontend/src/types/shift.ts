/** Cashier shift (M8 ShiftRead). Decimals arrive as strings. */
export interface Shift {
  id: number
  user_id: number
  opening_float: string
  closing_cash_counted: string | null
  expected_cash: string | null
  cash_variance: string | null
  closing_note: string | null
  opened_at: string
  closed_at: string | null
  is_open: boolean
}
