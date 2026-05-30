import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Settings } from '@/types/settings'

export const settingsKey = ['settings'] as const

/** Effective store settings — drives the cart's tax / service-charge preview. */
export function useSettings() {
  return useQuery({
    queryKey: settingsKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await apiClient.get<Settings>('/settings/')
      return res.data
    },
  })
}
