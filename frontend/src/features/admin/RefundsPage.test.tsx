import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/refunds', () => ({
  useRefunds: () => ({
    data: [
      {
        id: 1,
        order_id: 42,
        refund_number: 'RF-1',
        amount: '50.00',
        reason: 'ลูกค้าคืน',
        refunded_by_user_id: 2,
        cashier_shift_id: 1,
        items: [{ id: 1, order_item_id: 11, qty: 1, amount: '50.00', restock: true }],
        created_at: '2026-05-01T03:00:00Z',
      },
    ],
    isPending: false,
  }),
  useCreateRefund: () => ({ mutateAsync: vi.fn(), isPending: false }),
  // The always-mounted create dialog calls this; closed → no order.
  useOrderLookup: () => ({ data: undefined, isPending: false, isError: false }),
}))
vi.mock('@/features/pos/api/products', () => ({
  useProducts: () => ({ data: [], isPending: false }),
}))

import { RefundsPage } from '@/features/admin/RefundsPage'

describe('RefundsPage', () => {
  it('lists refunds with number, order and amount', () => {
    render(<RefundsPage />)
    expect(screen.getByText('RF-1')).toBeInTheDocument()
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('ลูกค้าคืน')).toBeInTheDocument()
  })
})
