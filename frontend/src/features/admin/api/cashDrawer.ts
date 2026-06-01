import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { CashMovement, CashMovementType } from '@/types/cash'

export const cashMovementsKey = ['admin', 'cash-drawer', 'movements'] as const

/** Movements for the caller's open shift. Errors (404) when no shift is open. */
export function useCashMovements() {
  return useQuery({
    queryKey: cashMovementsKey,
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get<CashMovement[]>('/cash-drawer/movements')
      return res.data
    },
  })
}

export interface CashMovementInput {
  type: CashMovementType
  amount: number
  reason: string | null
}

export function useRecordCashMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CashMovementInput) => {
      const res = await apiClient.post<CashMovement>('/cash-drawer/movements', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: cashMovementsKey })
    },
  })
}
