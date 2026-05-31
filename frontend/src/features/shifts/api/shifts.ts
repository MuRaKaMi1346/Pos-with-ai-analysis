import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Shift } from '@/types/shift'

export const shiftsKey = ['shifts'] as const

function statusOf(err: unknown): number | undefined {
  return (err as { response?: { status?: number } }).response?.status
}

/** The caller's open shift, or `null` when none is open (backend 404). */
export function useCurrentShift() {
  return useQuery({
    queryKey: [...shiftsKey, 'current'] as const,
    queryFn: async () => {
      try {
        const res = await apiClient.get<Shift>('/shifts/current')
        return res.data
      } catch (err) {
        if (statusOf(err) === 404) return null
        throw err
      }
    },
  })
}

export function useOpenShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (openingFloat: number) => {
      const res = await apiClient.post<Shift>('/shifts/open', {
        opening_float: openingFloat.toFixed(2),
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftsKey })
    },
  })
}

export function useCloseShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { closing_cash_counted: number; closing_note?: string | null }) => {
      const res = await apiClient.post<Shift>('/shifts/close', {
        closing_cash_counted: body.closing_cash_counted.toFixed(2),
        closing_note: body.closing_note ?? null,
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftsKey })
    },
  })
}
