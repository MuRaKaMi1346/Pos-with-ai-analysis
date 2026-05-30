import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateOrder } from '@/features/pos/api/products'
import { useSettings } from '@/features/pos/api/settings'
import { Cart } from '@/features/pos/components/Cart'
import { useCartStore } from '@/features/pos/stores/cartStore'
import type { Product } from '@/types/product'
import type { Settings } from '@/types/settings'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/pos/api/settings', () => ({ useSettings: vi.fn() }))
vi.mock('@/features/pos/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/pos/api/products')>()
  return { ...actual, useCreateOrder: vi.fn() }
})

const latte: Product = {
  id: 1,
  name: 'Latte',
  category_id: null,
  price: '65.00',
  cost: '0',
  image: null,
  is_active: true,
  has_modifiers: false,
  created_at: '',
  updated_at: '',
}

const settings: Settings = {
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
}

const mutateAsync = vi.fn()

beforeEach(() => {
  useCartStore.setState({ lines: [], channel: 'takeaway', tableNumber: '' })
  mutateAsync.mockReset()
  vi.mocked(useSettings).mockReturnValue({
    data: settings,
  } as unknown as ReturnType<typeof useSettings>)
  vi.mocked(useCreateOrder).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateOrder>)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Cart', () => {
  it('shows the empty state when there are no lines', () => {
    render(<Cart />)
    expect(screen.getByText(/เลือกเมนูเพื่อเริ่มการขาย/)).toBeInTheDocument()
  })

  it('renders ticket lines with a totals breakdown', () => {
    useCartStore.getState().addLine(latte)
    useCartStore.getState().addLine(latte) // qty 2 → 130
    render(<Cart />)
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('ยอดรวมย่อย')).toBeInTheDocument()
    expect(screen.getAllByText(/130\.00/).length).toBeGreaterThan(0)
  })

  it('charges: posts items with modifier ids + channel, then clears the ticket', async () => {
    mutateAsync.mockResolvedValue({ order_number: '20260530-0001', total: '130.00' })
    useCartStore.getState().setChannel('dine_in')
    useCartStore.getState().setTableNumber('A3')
    useCartStore.getState().addLine(latte)
    render(<Cart />)

    await userEvent.click(screen.getByRole('button', { name: 'ชำระเงิน' }))
    expect(mutateAsync).toHaveBeenCalledWith({
      items: [{ product_id: 1, qty: 1, modifier_ids: [] }],
      channel: 'dine_in',
      table_number: 'A3',
    })
    await waitFor(() => {
      expect(useCartStore.getState().lines).toHaveLength(0)
    })
  })
})
