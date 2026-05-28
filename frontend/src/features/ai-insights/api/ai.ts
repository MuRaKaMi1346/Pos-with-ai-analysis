import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type {
  ForecastResponse,
  PurchaseSuggestionResponse,
  StrategyResponse,
  TrainResponse,
} from '@/types/ai'

export function useForecast(productId: number | null, horizon = 14) {
  return useQuery({
    queryKey: ['ai', 'forecast', productId, horizon],
    enabled: productId !== null,
    queryFn: async () => {
      const res = await apiClient.get<ForecastResponse>('/ai/forecast', {
        params: { product_id: productId, horizon },
      })
      return res.data
    },
  })
}

export function usePurchaseSuggestion(days = 14) {
  return useQuery({
    queryKey: ['ai', 'purchase-suggestion', days],
    queryFn: async () => {
      const res = await apiClient.get<PurchaseSuggestionResponse>(
        '/ai/purchase-suggestion',
        { params: { days } },
      )
      return res.data
    },
  })
}

export function useDailyStrategy(days = 30) {
  return useQuery({
    queryKey: ['ai', 'strategy', days],
    queryFn: async () => {
      const res = await apiClient.get<StrategyResponse>('/ai/strategy/daily', {
        params: { days },
      })
      return res.data
    },
  })
}

export function useTrainModels() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<TrainResponse>('/ai/train')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai'] })
    },
  })
}
