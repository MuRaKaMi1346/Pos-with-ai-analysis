export interface ForecastPoint {
  date: string
  predicted_qty: number
}

export interface ForecastResponse {
  product_id: number
  horizon: number
  points: ForecastPoint[]
}

export interface PurchaseSuggestionRow {
  ingredient_id: number
  ingredient_name: string
  unit: string
  current_stock: string
  forecast_required: string
  suggested_order_qty: string
}

export interface PurchaseSuggestionResponse {
  days: number
  rows: PurchaseSuggestionRow[]
}

export type StrategyType =
  | 'bundle'
  | 'star'
  | 'slow_mover'
  | 'high_margin'
  | 'low_margin'
  | (string & {})

export interface StrategyInsight {
  type: StrategyType
  title: string
  description: string
  data: Record<string, unknown>
}

export interface StrategyResponse {
  generated_at: string
  days: number
  insights: StrategyInsight[]
  summary_th: string | null
}

export interface TrainResponse {
  trained: number[]
  skipped: number[]
}
