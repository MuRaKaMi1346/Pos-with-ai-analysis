import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { KdsTicket } from '@/types/kds'

export const kdsKey = ['kds', 'tickets'] as const

/** Live ticket feed for the kitchen display — polls so new/bumped tickets appear. */
export function useKdsTickets() {
  return useQuery({
    queryKey: kdsKey,
    queryFn: async () => {
      const res = await apiClient.get<KdsTicket[]>('/kds/tickets')
      return res.data
    },
    refetchInterval: 5000,
  })
}

export function useBumpTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiClient.post<KdsTicket>(`/kds/tickets/${ticketId}/bump`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kdsKey })
    },
  })
}

export function useRecallTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiClient.post<KdsTicket>(`/kds/tickets/${ticketId}/recall`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kdsKey })
    },
  })
}
