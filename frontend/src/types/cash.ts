export type CashMovementType = 'pay_in' | 'pay_out'

export const CASH_MOVEMENT_LABELS: Record<CashMovementType, string> = {
  pay_in: 'เงินเข้า',
  pay_out: 'เงินออก',
}

export interface CashMovement {
  id: number
  cashier_shift_id: number
  type: CashMovementType
  /** Positive Decimal string; the type determines the sign. */
  amount: string
  reason: string | null
  user_id: number
  created_at: string
}
