import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { ModifierGroup } from '@/types/modifier'
import type { Order, OrderCreate } from '@/types/order'
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
