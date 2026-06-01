/** Stock movement type (mirrors backend MovementType enum values). */
export type MovementType = 'receive' | 'sale' | 'waste' | 'adjust' | 'return'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receive: 'รับเข้า',
  sale: 'ขาย',
  waste: 'ของเสีย',
  adjust: 'ปรับยอด',
  return: 'คืนสต็อก',
}

export interface StockLevel {
  id: number
  ingredient_id: number
  /** Decimal strings. */
  quantity: string
  reorder_point: string | null
  updated_at: string
}

export interface StockMovement {
  id: number
  ingredient_id: number
  type: MovementType
  /** Signed Decimal string (+ in, − out). */
  qty: string
  ref: string | null
  note: string | null
  user_id: number | null
  created_at: string
}
