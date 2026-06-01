import type { OrderChannel, OrderStatus } from '@/types/order'

/** Richer order shape for the admin order-management screens (GET /orders[/{id}]).
 * The POS `Order` type is a deliberate subset; this captures the extra fields
 * those screens render (item void state, applied discounts, totals breakdown). */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'เปิดอยู่',
  hold: 'พักไว้',
  paid: 'ชำระแล้ว',
  voided: 'ยกเลิก',
  partially_refunded: 'คืนบางส่วน',
  refunded: 'คืนเต็มจำนวน',
}

export interface OrderItemDetail {
  id: number
  product_id: number
  qty: number
  unit_price: string
  is_voided: boolean
  voided_reason: string | null
}

export interface OrderDiscount {
  id: number
  name: string
  amount_off: string
}

export interface OrderDetail {
  id: number
  order_number: string
  channel: OrderChannel
  table_number: string | null
  status: OrderStatus
  note: string | null
  items: OrderItemDetail[]
  discounts: OrderDiscount[]
  subtotal: string
  discount_total: string
  service_charge: string
  tax_total: string
  total: string
  paid_total: string
  change_due: string
  sent_to_kitchen_at: string | null
  void_reason: string | null
  created_at: string
}
