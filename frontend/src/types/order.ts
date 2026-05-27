export type OrderStatus = 'open' | 'paid' | 'voided' | 'refunded'

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
  total: string
  status: OrderStatus
  user_id: number | null
  note: string | null
  items: OrderItemRead[]
  created_at: string
  updated_at: string
}
