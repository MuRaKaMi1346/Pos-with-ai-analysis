import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Customer } from '@/types/customer'

export const customersKey = ['customers'] as const

/** Search customers by name / phone / code (M7). Empty query returns recent. */
export function useCustomerSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: [...customersKey, 'search', query] as const,
    enabled,
    queryFn: async () => {
      const res = await apiClient.get<Customer[]>('/customers/', {
        params: { q: query || undefined, limit: 20 },
      })
      return res.data
    },
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; phone?: string | null }) => {
      const res = await apiClient.post<Customer>('/customers/', body)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customersKey })
    },
  })
}
