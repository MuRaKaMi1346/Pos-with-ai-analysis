import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { productsKey } from '@/features/pos/api/products'
import { apiClient } from '@/lib/api/client'
import type { Product } from '@/types/product'

export const adminProductsKey = ['admin', 'products'] as const

/** Product catalogue for management — `activeOnly=false` includes deactivated. */
export function useAdminProducts(activeOnly = true) {
  return useQuery({
    queryKey: [...adminProductsKey, { activeOnly }] as const,
    queryFn: async () => {
      const res = await apiClient.get<Product[]>('/products/', {
        params: { active_only: activeOnly, limit: 500 },
      })
      return res.data
    },
  })
}

export interface ProductInput {
  name: string
  category_id: number | null
  price: number
  cost: number
  image: string | null
  sku: string | null
  barcode: string | null
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: adminProductsKey })
  void qc.invalidateQueries({ queryKey: productsKey }) // keep the POS catalogue fresh too
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ProductInput) => {
      const res = await apiClient.post<Product>('/products/', body)
      return res.data
    },
    onSuccess: () => {
      invalidateAll(qc)
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<ProductInput> & { is_active?: boolean }
    }) => {
      const res = await apiClient.patch<Product>(`/products/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      invalidateAll(qc)
    },
  })
}

export function useDeactivateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<Product>(`/products/${id}`)
      return res.data
    },
    onSuccess: () => {
      invalidateAll(qc)
    },
  })
}
