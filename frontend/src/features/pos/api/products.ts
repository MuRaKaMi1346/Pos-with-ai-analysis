import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { ModifierGroup } from '@/types/modifier'
import type { Order, OrderCreate } from '@/types/order'
import type { TenderInput } from '@/types/payment'
import type { Category, Product } from '@/types/product'

export const productsKey = ['products'] as const
export const categoriesKey = ['categories'] as const
export const ordersKey = ['orders'] as const
export const productModifiersKey = (productId: number) => ['product-modifiers', productId] as const

export function useProducts() {
  return useQuery({
    queryKey: productsKey,
    queryFn: async () => {
      const res = await apiClient.get<Product[]>('/products/')
      return res.data
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: async () => {
      const res = await apiClient.get<Category[]>('/categories/')
      return res.data
    },
  })
}

/** A product's modifier groups for the picker — only fetched when a product is set. */
export function useProductModifiers(productId: number | null) {
  return useQuery({
    queryKey: productModifiersKey(productId ?? 0),
    enabled: productId !== null,
    queryFn: async () => {
      const res = await apiClient.get<ModifierGroup[]>(`/products/${productId}/modifiers`)
      return res.data
    },
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: OrderCreate) => {
      const res = await apiClient.post<Order>('/orders/', payload)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordersKey })
      qc.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

interface PayVars {
  orderId: number
  tenders: TenderInput[]
  /** Replays the same charge on retry instead of double-charging (M5). */
  idempotencyKey?: string
}

export function usePayOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, tenders, idempotencyKey }: PayVars) => {
      const body = {
        tenders: tenders.map((t) => ({
          method: t.method,
          amount: t.amount.toFixed(2),
          reference: t.reference,
          tendered_amount:
            t.tendered_amount !== undefined ? t.tendered_amount.toFixed(2) : undefined,
        })),
      }
      const res = await apiClient.post<Order>(`/orders/${orderId}/pay`, body, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordersKey })
      qc.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}
