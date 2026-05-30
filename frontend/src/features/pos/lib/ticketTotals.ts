import type { Settings } from '@/types/settings'

export interface TicketTotals {
  subtotal: number
  serviceCharge: number
  taxTotal: number
  total: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Client-side preview of the bill totals. Mirrors the backend
 * `order_service.calculate_totals` for the case the POS supports today
 * (no discounts / tip yet — those arrive with the discount UI), so the cart
 * footer matches the order the backend will create on Charge.
 *
 * Service charge follows the configured rate (the backend applies it by rate,
 * not by channel); the cart simply hides the row when it is zero.
 */
export function computeTicketTotals(subtotal: number, settings: Settings): TicketTotals {
  const base = subtotal
  const serviceRate = Number(settings.service_charge_rate)
  const taxRate = Number(settings.vat_rate)

  let serviceCharge: number
  let taxTotal: number
  let total: number

  if (settings.tax_inclusive) {
    serviceCharge = round2(base * serviceRate)
    const grossPreTip = base + serviceCharge
    taxTotal = taxRate > 0 ? round2(grossPreTip - grossPreTip / (1 + taxRate)) : 0
    total = grossPreTip
  } else if (settings.service_charge_before_vat) {
    serviceCharge = round2(base * serviceRate)
    taxTotal = round2((base + serviceCharge) * taxRate)
    total = base + serviceCharge + taxTotal
  } else {
    taxTotal = round2(base * taxRate)
    serviceCharge = round2((base + taxTotal) * serviceRate)
    total = base + serviceCharge + taxTotal
  }

  total = settings.rounding_mode === 'NEAREST_BAHT' ? Math.round(total) : round2(total)

  return { subtotal: round2(base), serviceCharge, taxTotal, total }
}
