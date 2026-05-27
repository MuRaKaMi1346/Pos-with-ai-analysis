import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type {
  CategoryMixRow,
  Granularity,
  PeakHoursCell,
  SalesTrendResponse,
  SummaryResponse,
  TopProductRow,
} from '@/types/dashboard'

export interface DateRange {
  from: string
  to: string
}

function dashboardKey(suffix: string, range: DateRange, extra?: object) {
  return ['dashboard', suffix, range, extra] as const
}

export function useSummary(range: DateRange) {
  return useQuery({
    queryKey: dashboardKey('summary', range),
    queryFn: async () => {
      const res = await apiClient.get<SummaryResponse>('/dashboard/summary', {
        params: { from: range.from, to: range.to },
      })
      return res.data
    },
  })
}

export function useSalesTrend(range: DateRange, granularity: Granularity = 'day') {
  return useQuery({
    queryKey: dashboardKey('sales-trend', range, { granularity }),
    queryFn: async () => {
      const res = await apiClient.get<SalesTrendResponse>('/dashboard/sales-trend', {
        params: { from: range.from, to: range.to, granularity },
      })
      return res.data
    },
  })
}

export function useTopProducts(range: DateRange, limit = 10) {
  return useQuery({
    queryKey: dashboardKey('top-products', range, { limit }),
    queryFn: async () => {
      const res = await apiClient.get<TopProductRow[]>('/dashboard/top-products', {
        params: { from: range.from, to: range.to, limit },
      })
      return res.data
    },
  })
}

export function usePeakHours(range: DateRange) {
  return useQuery({
    queryKey: dashboardKey('peak-hours', range),
    queryFn: async () => {
      const res = await apiClient.get<PeakHoursCell[]>('/dashboard/peak-hours', {
        params: { from: range.from, to: range.to },
      })
      return res.data
    },
  })
}

export function useCategoryMix(range: DateRange) {
  return useQuery({
    queryKey: dashboardKey('category-mix', range),
    queryFn: async () => {
      const res = await apiClient.get<CategoryMixRow[]>('/dashboard/category-mix', {
        params: { from: range.from, to: range.to },
      })
      return res.data
    },
  })
}
