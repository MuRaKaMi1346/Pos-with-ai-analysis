import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { OrderDetail } from '@/types/orderDetail'

export const adminOrdersKey = ['admin', 'orders'] as const
export const adminOrderKey = (id: number) => ['admin', 'order', id] as const

export function useOrders(limit = 100) {
  return useQuery({
    queryKey: [...adminOrdersKey, { limit }] as const,
    queryFn: async () => {
      const res = await apiClient.get<OrderDetail[]>('/orders/', { params: { limit } })
      return res.data
    },
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: id === null ? adminOrdersKey : adminOrderKey(id),
    enabled: id !== null,
    queryFn: async () => {
      const res = await apiClient.get<OrderDetail>(`/orders/${id}`)
      return res.data
    },
  })
}

/** Ad-hoc discount (name+type+value+reason) or a coded one (code). */
export interface ApplyDiscountInput {
  code?: string
  name?: string
  type?: 'percent' | 'amount'
  value?: number
  reason?: string
}

function useOrderMutation<TVars>(fn: (vars: TVars) => Promise<OrderDetail>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: adminOrdersKey })
      void qc.invalidateQueries({ queryKey: adminOrderKey(order.id) })
    },
  })
}

export function useSendToKitchen() {
  return useOrderMutation(async (orderId: number) => {
    const res = await apiClient.post<OrderDetail>(`/orders/${orderId}/send-to-kitchen`)
    return res.data
  })
}

export function useVoidItem() {
  return useOrderMutation(
    async ({ orderId, itemId, reason }: { orderId: number; itemId: number; reason: string }) => {
      const res = await apiClient.post<OrderDetail>(`/orders/${orderId}/items/${itemId}/void`, {
        reason,
      })
      return res.data
    },
  )
}

export function useVoidOrder() {
  return useOrderMutation(async ({ orderId, reason }: { orderId: number; reason: string }) => {
    const res = await apiClient.post<OrderDetail>(`/orders/${orderId}/void`, { reason })
    return res.data
  })
}

export function useApplyOrderDiscount() {
  return useOrderMutation(
    async ({ orderId, body }: { orderId: number; body: ApplyDiscountInput }) => {
      const res = await apiClient.post<OrderDetail>(`/orders/${orderId}/discounts`, body)
      return res.data
    },
  )
}

export function useRemoveOrderDiscount() {
  return useOrderMutation(
    async ({ orderId, orderDiscountId }: { orderId: number; orderDiscountId: number }) => {
      const res = await apiClient.delete<OrderDetail>(
        `/orders/${orderId}/discounts/${orderDiscountId}`,
      )
      return res.data
    },
  )
}
