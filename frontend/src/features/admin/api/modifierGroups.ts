import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/lib/api/client'
import type { ModifierGroup } from '@/types/modifier'

export const modifierGroupsKey = ['admin', 'modifier-groups'] as const

export function useModifierGroups() {
  return useQuery({
    queryKey: modifierGroupsKey,
    queryFn: async () => {
      const res = await apiClient.get<ModifierGroup[]>('/modifier-groups/')
      return res.data
    },
  })
}

export interface ModifierInput {
  name: string
  price_delta: number
}

export interface ModifierGroupCreateInput {
  name: string
  min_select: number
  max_select: number
  is_required: boolean
  modifiers: ModifierInput[]
}

/** Group settings only — the backend's PATCH doesn't touch the modifier list. */
export type ModifierGroupUpdateInput = Omit<ModifierGroupCreateInput, 'modifiers'>

export function useCreateModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ModifierGroupCreateInput) => {
      const body = {
        name: input.name,
        min_select: input.min_select,
        max_select: input.max_select,
        is_required: input.is_required,
        sort_order: 0,
        modifiers: input.modifiers.map((m, i) => ({
          name: m.name,
          price_delta: m.price_delta,
          sort_order: i,
          is_active: true,
        })),
      }
      const res = await apiClient.post<ModifierGroup>('/modifier-groups/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: modifierGroupsKey })
    },
  })
}

export function useUpdateModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ModifierGroupUpdateInput }) => {
      const res = await apiClient.patch<ModifierGroup>(`/modifier-groups/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: modifierGroupsKey })
    },
  })
}

export function useDeleteModifierGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/modifier-groups/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: modifierGroupsKey })
    },
  })
}
