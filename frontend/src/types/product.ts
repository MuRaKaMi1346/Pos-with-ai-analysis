export interface Product {
  id: number
  name: string
  category_id: number | null
  /** Decimal as string from backend (preserves precision). */
  price: string
  cost: string
  image: string | null
  is_active: boolean
  /** M13: product has ≥1 active modifier — drives the customise dot + picker. */
  has_modifiers: boolean
  created_at: string
  updated_at: string
}

export type Station = 'bar' | 'kitchen'

/** Category as returned by GET /categories/ (M12 — powers the POS rail). */
export interface Category {
  id: number
  name: string
  default_station: Station
}
