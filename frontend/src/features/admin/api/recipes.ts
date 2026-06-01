import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { Unit } from '@/types/ingredient'
import type { Recipe } from '@/types/recipe'

export const recipesKey = ['admin', 'recipes'] as const

/** BOM lines for one product (the backend requires a product_id). */
export function useRecipes(productId: number | null) {
  return useQuery({
    queryKey: [...recipesKey, productId] as const,
    enabled: productId !== null,
    queryFn: async () => {
      const res = await apiClient.get<Recipe[]>('/recipes/', {
        params: { product_id: productId },
      })
      return res.data
    },
  })
}

export interface RecipeLineInput {
  ingredient_id: number
  qty: number
  unit: Unit
}

export function useCreateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: RecipeLineInput & { product_id: number }) => {
      const res = await apiClient.post<Recipe>('/recipes/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recipesKey })
    },
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipeId: number) => {
      await apiClient.delete(`/recipes/${recipeId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recipesKey })
    },
  })
}
