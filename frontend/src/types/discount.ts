export type DiscountScope = 'order' | 'item'
export type DiscountType = 'percent' | 'amount' | 'points'

export const SCOPE_LABELS: Record<DiscountScope, string> = {
  order: 'ทั้งบิล',
  item: 'รายรายการ',
}
export const TYPE_LABELS: Record<DiscountType, string> = {
  percent: 'เปอร์เซ็นต์',
  amount: 'จำนวนเงิน',
  points: 'แต้มสะสม',
}

export interface Discount {
  id: number
  code: string | null
  name: string
  scope: DiscountScope
  type: DiscountType
  /** Decimal string. For percent, 0.10 == 10%. */
  value: string
  starts_at: string | null
  ends_at: string | null
  min_order_amount: string | null
  max_discount_amount: string | null
  requires_admin: boolean
  is_active: boolean
  created_at: string
}
