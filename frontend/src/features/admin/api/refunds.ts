import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Order } from '@/types/order'
import type { Refund } from '@/types/refund'

export const refundsKey = ['admin', 'refunds'] as const

export function useRefunds(orderId?: number) {
  return useQuery({
    queryKey: [...refundsKey, { orderId: orderId ?? null }] as const,
    queryFn: async () => {
      const res = await apiClient.get<Refund[]>('/refunds/', {
        params: { order_id: orderId, limit: 100 },
      })
      return res.data
    },
  })
}

/** Fetch a single order (with its items) for the refund picker. */
export function useOrderLookup(orderId: number | null) {
  return useQuery({
    queryKey: ['admin', 'order-lookup', orderId] as const,
    enabled: orderId !== null && orderId > 0,
    retry: false,
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/orders/${orderId}`)
      return res.data
    },
  })
}

export interface RefundItemInput {
  order_item_id: number
  qty: number
  restock: boolean
}

export interface RefundCreateInput {
  order_id: number
  items: RefundItemInput[]
  reason: string | null
}

export function useCreateRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: RefundCreateInput) => {
      const res = await apiClient.post<Refund>('/refunds/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: refundsKey })
    },
  })
}
