import type { OrderChannel, OrderStatus } from '@/types/order'
import type { PaymentMethod } from '@/types/payment'

/** Receipt DTO from GET /orders/{id}/receipt (M11). Decimals arrive as strings. */
export interface ReceiptStore {
  name: string
  address: string | null
  tax_id: string | null
}

export interface ReceiptModifier {
  name: string
  price_delta: string
}

export interface ReceiptLine {
  product_name: string
  qty: number
  unit_price: string
  modifiers: ReceiptModifier[]
  line_total: string
}

export interface ReceiptPayment {
  method: PaymentMethod
  amount: string
  reference: string | null
  tendered_amount: string | null
}

export interface Receipt {
  store: ReceiptStore
  order_number: string
  status: OrderStatus
  channel: OrderChannel
  table_number: string | null
  cashier_name: string | null
  customer_name: string | null
  created_at: string
  closed_at: string | null
  currency: string
  lines: ReceiptLine[]
  subtotal: string
  discount_total: string
  service_charge: string
  service_charge_rate: string
  tax_total: string
  tax_rate: string
  tax_inclusive: boolean
  tip_total: string
  rounding_adjustment: string
  total: string
  paid_total: string
  change_due: string
  payments: ReceiptPayment[]
  footer: string | null
}
