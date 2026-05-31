import type { OrderChannel } from '@/types/order'
import type { Station } from '@/types/product'

export type KdsStatus = 'new' | 'in_progress' | 'done'

export interface KdsLine {
  order_item_id: number
  product_id: number
  product_name: string
  qty: number
  modifiers: string[]
}

/** A kitchen-display ticket (M9 KdsTicketRead). */
export interface KdsTicket {
  id: number
  order_id: number
  order_number: string
  table_number: string | null
  channel: OrderChannel
  station: Station
  status: KdsStatus
  printed_at: string
  bumped_at: string | null
  lines: KdsLine[]
}
