import { useMutation, useQueryClient } from '@tanstack/react-query'

import { settingsKey } from '@/features/pos/api/settings'
import { apiClient } from '@/lib/api/client'
import type { OrderChannel } from '@/types/order'
import type { RoundingMode, Settings } from '@/types/settings'

/** Editable store settings (mirrors backend SettingsUpdate; decimals as numbers). */
export interface SettingsFormInput {
  store_name: string
  store_address: string | null
  store_tax_id: string | null
  currency: string
  vat_rate: number
  tax_inclusive: boolean
  service_charge_rate: number
  service_charge_before_vat: boolean
  rounding_mode: RoundingMode
  default_channel: OrderChannel
  loyalty_baht_per_earn_point: number
  loyalty_baht_per_redeem_point: number
  receipt_footer: string | null
  receipt_pdf_enabled: boolean
  printer_name: string | null
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: SettingsFormInput) => {
      const res = await apiClient.patch<Settings>('/settings/', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKey })
    },
  })
}
