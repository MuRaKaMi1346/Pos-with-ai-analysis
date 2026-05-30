import { describe, expect, it } from 'vitest'

import { computeTicketTotals } from '@/features/pos/lib/ticketTotals'
import type { Settings } from '@/types/settings'

function makeSettings(over: Partial<Settings>): Settings {
  return {
    store_name: 'Test',
    store_address: null,
    store_tax_id: null,
    currency: 'THB',
    vat_rate: '0.07',
    tax_inclusive: true,
    service_charge_rate: '0.00',
    service_charge_before_vat: true,
    rounding_mode: 'TWO_DECIMALS',
    default_channel: 'takeaway',
    loyalty_baht_per_earn_point: '20',
    loyalty_baht_per_redeem_point: '0.10',
    receipt_footer: null,
    receipt_pdf_enabled: false,
    printer_name: null,
    ...over,
  }
}

describe('computeTicketTotals', () => {
  it('VAT inclusive: tax is embedded and total equals subtotal', () => {
    const t = computeTicketTotals(107, makeSettings({ vat_rate: '0.07', tax_inclusive: true }))
    expect(t.taxTotal).toBe(7)
    expect(t.serviceCharge).toBe(0)
    expect(t.total).toBe(107)
  })

  it('VAT exclusive with service charged before VAT', () => {
    const t = computeTicketTotals(
      100,
      makeSettings({
        vat_rate: '0.07',
        tax_inclusive: false,
        service_charge_rate: '0.10',
        service_charge_before_vat: true,
      }),
    )
    expect(t.serviceCharge).toBe(10)
    expect(t.taxTotal).toBe(7.7)
    expect(t.total).toBe(117.7)
  })

  it('VAT exclusive with service charged after VAT', () => {
    const t = computeTicketTotals(
      100,
      makeSettings({
        vat_rate: '0.07',
        tax_inclusive: false,
        service_charge_rate: '0.10',
        service_charge_before_vat: false,
      }),
    )
    expect(t.taxTotal).toBe(7)
    expect(t.serviceCharge).toBe(10.7)
    expect(t.total).toBe(117.7)
  })

  it('NEAREST_BAHT rounds the grand total to a whole baht', () => {
    const t = computeTicketTotals(
      99,
      makeSettings({ vat_rate: '0.07', tax_inclusive: false, rounding_mode: 'NEAREST_BAHT' }),
    )
    expect(t.taxTotal).toBe(6.93)
    expect(t.total).toBe(106)
  })

  it('no tax / no service yields a clean subtotal', () => {
    const t = computeTicketTotals(
      50,
      makeSettings({ vat_rate: '0.00', tax_inclusive: false, service_charge_rate: '0.00' }),
    )
    expect(t).toEqual({ subtotal: 50, serviceCharge: 0, taxTotal: 0, total: 50 })
  })
})
