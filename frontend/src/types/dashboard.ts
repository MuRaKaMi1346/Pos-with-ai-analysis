export type Granularity = 'day' | 'hour'

export interface SummaryResponse {
  from: string
  to: string
  total_revenue: string
  order_count: number
  gross_profit: string
  average_ticket: string
}

export interface SalesTrendPoint {
  bucket: string
  revenue: string
  order_count: number
}

export interface SalesTrendResponse {
  granularity: Granularity
  points: SalesTrendPoint[]
}

export interface TopProductRow {
  product_id: number
  product_name: string
  quantity_sold: number
  revenue: string
  gross_profit: string
}

/** SQLite ``%w``: 0=Sunday, 1=Monday, ..., 6=Saturday. */
export interface PeakHoursCell {
  weekday: number
  hour: number
  revenue: string
  order_count: number
}

export interface CategoryMixRow {
  category_id: number | null
  category_name: string
  revenue: string
  share_pct: string
}
