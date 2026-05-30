export type OrderStatus = 'open' | 'hold' | 'paid' | 'voided' | 'partially_refunded' | 'refunded'

export type OrderChannel = 'dine_in' | 'takeaway' | 'delivery'

export interface OrderItemModifierIn {
  modifier_id: number
}

export interface OrderItemIn {
  product_id: number
  qty: number
  modifier_ids?: number[]
}

export interface OrderCreate {
  items: OrderItemIn[]
  channel?: OrderChannel
  table_number?: string | null
  customer_id?: number | null
  note?: string | null
}

export interface OrderItemModifierRead {
  id: number
  modifier_id: number
  price_delta: string
}

export interface OrderItemRead {
  id: number
  product_id: number
  qty: number
  unit_price: string
  modifiers: OrderItemModifierRead[]
}

export interface Order {
  id: number
  order_number: string
  channel: OrderChannel
  table_number: string | null
  total: string
  status: OrderStatus
  user_id: number | null
  note: string | null
  items: OrderItemRead[]
  /** Sum of payments minus refunds (M5). */
  paid_total: string
  /** Cash overpayment returned to the customer (M5). */
  change_due: string
  created_at: string
  updated_at: string
}
