import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Order, OrderCreate } from '@/types/order'
import type { Category, Product } from '@/types/product'

export const productsKey = ['products'] as const
export const categoriesKey = ['categories'] as const
export const ordersKey = ['orders'] as const

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
