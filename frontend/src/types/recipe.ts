import type { Unit } from '@/types/ingredient'

/** A BOM line: links a product (or modifier) to an ingredient + quantity. */
export interface Recipe {
  id: number
  product_id: number | null
  modifier_id: number | null
  ingredient_id: number
  /** Decimal string. */
  qty: string
  unit: Unit
}
