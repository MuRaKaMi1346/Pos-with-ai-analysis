import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Ingredient, Unit } from '@/types/ingredient'

export const ingredientsKey = ['admin', 'ingredients'] as const

/** Ingredient master list. `activeOnly=false` includes deactivated rows. */
export function useIngredients(activeOnly = true) {
  return useQuery({
    queryKey: [...ingredientsKey, { activeOnly }] as const,
    queryFn: async () => {
      const res = await apiClient.get<Ingredient[]>('/ingredients/', {
        params: { active_only: activeOnly },
      })
      return res.data
    },
  })
}

export interface IngredientInput {
  name: string
  unit: Unit
  shelf_life_days: number | null
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: IngredientInput) => {
      const res = await apiClient.post<Ingredient>('/ingredients/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingredientsKey })
    },
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<IngredientInput> & { is_active?: boolean }
    }) => {
      const res = await apiClient.patch<Ingredient>(`/ingredients/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingredientsKey })
    },
  })
}

/** Soft-delete (deactivate) — the backend keeps the row, sets is_active=false. */
export function useDeactivateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<Ingredient>(`/ingredients/${id}`)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ingredientsKey })
    },
  })
}
