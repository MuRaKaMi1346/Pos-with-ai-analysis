/** A selectable modifier option (GET /products/{id}/modifiers). */
export interface ModifierOption {
  id: number
  name: string
  /** Decimal as string from backend. */
  price_delta: string
  sort_order: number
  is_active: boolean
}

/** A modifier group with its POS picker semantics (radio vs checkbox, required). */
export interface ModifierGroup {
  id: number
  name: string
  min_select: number
  max_select: number
  is_required: boolean
  sort_order: number
  modifiers: ModifierOption[]
}
