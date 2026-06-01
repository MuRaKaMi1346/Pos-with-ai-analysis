import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Discount, DiscountScope, DiscountType } from '@/types/discount'

export const discountsKey = ['admin', 'discounts'] as const

export function useDiscounts(activeOnly = false) {
  return useQuery({
    queryKey: [...discountsKey, { activeOnly }] as const,
    queryFn: async () => {
      const res = await apiClient.get<Discount[]>('/discounts/', {
        params: { active_only: activeOnly },
      })
      return res.data
    },
  })
}

/** Create payload — scope/type are fixed at creation (backend ignores them on update). */
export interface DiscountCreateInput {
  code: string | null
  name: string
  scope: DiscountScope
  type: DiscountType
  value: number
  min_order_amount: number | null
  max_discount_amount: number | null
  requires_admin: boolean
}

/** Fields the backend's DiscountUpdate accepts. */
export type DiscountUpdateInput = Omit<DiscountCreateInput, 'scope' | 'type'> & {
  is_active?: boolean
}

export function useCreateDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: DiscountCreateInput) => {
      const res = await apiClient.post<Discount>('/discounts/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: discountsKey })
    },
  })
}

export function useUpdateDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DiscountUpdateInput> }) => {
      const res = await apiClient.patch<Discount>(`/discounts/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: discountsKey })
    },
  })
}

export function useDeactivateDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<Discount>(`/discounts/${id}`)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: discountsKey })
    },
  })
}
