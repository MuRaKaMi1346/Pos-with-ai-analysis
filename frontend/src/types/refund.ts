export interface RefundItem {
  id: number
  order_item_id: number
  qty: number
  amount: string
  restock: boolean
}

export interface Refund {
  id: number
  order_id: number
  refund_number: string
  amount: string
  reason: string | null
  refunded_by_user_id: number
  cashier_shift_id: number | null
  items: RefundItem[]
  created_at: string
}
