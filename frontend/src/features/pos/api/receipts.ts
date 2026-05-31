import { apiClient } from '@/lib/api/client'
import type { Receipt } from '@/types/receipt'

/** One-shot receipt fetch for the success screen (M16). Null on failure. */
export async function fetchReceipt(orderId: number): Promise<Receipt | null> {
  try {
    const res = await apiClient.get<Receipt>(`/orders/${orderId}/receipt`)
    return res.data
  } catch {
    return null
  }
}
