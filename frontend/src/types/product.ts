export interface Product {
  id: number
  name: string
  category_id: number | null
  /** Decimal as string from backend (preserves precision). */
  price: string
  cost: string
  image: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
