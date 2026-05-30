import type { OrderChannel } from '@/types/order'

export type RoundingMode = 'TWO_DECIMALS' | 'NEAREST_BAHT'

/** Effective store settings (GET /settings/). Decimals arrive as strings. */
export interface Settings {
  store_name: string
  store_address: string | null
  store_tax_id: string | null
  currency: string
  vat_rate: string
  tax_inclusive: boolean
  service_charge_rate: string
  service_charge_before_vat: boolean
  rounding_mode: RoundingMode
  default_channel: OrderChannel
  loyalty_baht_per_earn_point: string
  loyalty_baht_per_redeem_point: string
  receipt_footer: string | null
  receipt_pdf_enabled: boolean
  printer_name: string | null
}
