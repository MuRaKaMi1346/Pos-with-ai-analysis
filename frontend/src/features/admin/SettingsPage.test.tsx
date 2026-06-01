import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const SETTINGS = {
  store_name: 'ร้านกาแฟ',
  store_address: null,
  store_tax_id: null,
  currency: 'THB',
  vat_rate: '0.07',
  tax_inclusive: true,
  service_charge_rate: '0.00',
  service_charge_before_vat: false,
  rounding_mode: 'TWO_DECIMALS',
  default_channel: 'dine_in',
  loyalty_baht_per_earn_point: '25.00',
  loyalty_baht_per_redeem_point: '1.0000',
  receipt_footer: 'ขอบคุณค่ะ',
  receipt_pdf_enabled: false,
  printer_name: null,
}
vi.mock('@/features/pos/api/settings', () => ({
  settingsKey: ['settings'],
  useSettings: () => ({ data: SETTINGS, isPending: false }),
}))
vi.mock('@/features/admin/api/settings', async (orig) => ({
  ...(await orig<typeof import('@/features/admin/api/settings')>()),
  useUpdateSettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { SettingsPage } from '@/features/admin/SettingsPage'

describe('SettingsPage', () => {
  it('prefills the form from the current settings', () => {
    render(<SettingsPage />)
    expect(screen.getByLabelText('ชื่อร้าน')).toHaveValue('ร้านกาแฟ')
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
  })
})
