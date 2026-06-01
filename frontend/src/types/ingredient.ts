/** Measurement unit for an ingredient (mirrors backend Unit enum values). */
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'piece' | 'shot' | 'pump' | 'pack'

export const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'piece', 'shot', 'pump', 'pack']

export const UNIT_LABELS: Record<Unit, string> = {
  g: 'กรัม (g)',
  kg: 'กิโลกรัม (kg)',
  ml: 'มิลลิลิตร (ml)',
  l: 'ลิตร (l)',
  piece: 'ชิ้น',
  shot: 'ช็อต',
  pump: 'ปั๊ม',
  pack: 'แพ็ค',
}

export interface Ingredient {
  id: number
  name: string
  unit: Unit
  shelf_life_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Ingredient + its current stock row (Decimal strings; null when no stock row). */
export interface IngredientWithStock extends Ingredient {
  quantity: string | null
  reorder_point: string | null
}
