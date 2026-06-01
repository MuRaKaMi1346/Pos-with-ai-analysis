import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { MovementType, StockLevel, StockMovement } from '@/types/inventory'

export const stockKey = ['admin', 'inventory', 'stock'] as const
export const movementsKey = ['admin', 'inventory', 'movements'] as const

/** Current stock level per ingredient. */
export function useStockLevels() {
  return useQuery({
    queryKey: stockKey,
    queryFn: async () => {
      const res = await apiClient.get<StockLevel[]>('/inventory/stock')
      return res.data
    },
  })
}

export interface ReceiveStockInput {
  ingredient_id: number
  qty: number
  ref: string | null
  note: string | null
}

export function useReceiveStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ReceiveStockInput) => {
      const res = await apiClient.post<StockLevel>('/inventory/receive', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: stockKey })
      void qc.invalidateQueries({ queryKey: movementsKey })
    },
  })
}

export interface MovementFilter {
  ingredientId?: number
  type?: MovementType
  limit?: number
}

/** Stock movement log, newest first; optionally filtered by ingredient / type. */
export function useStockMovements(filter: MovementFilter = {}) {
  return useQuery({
    queryKey: [...movementsKey, filter] as const,
    queryFn: async () => {
      const res = await apiClient.get<StockMovement[]>('/inventory/movements', {
        params: {
          ingredient_id: filter.ingredientId,
          movement_type: filter.type,
          limit: filter.limit ?? 50,
        },
      })
      return res.data
    },
  })
}
