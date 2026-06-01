import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/orders', () => {
  const stub = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    adminOrdersKey: ['admin', 'orders'],
    adminOrderKey: (id: number) => ['admin', 'order', id],
    useOrders: () => ({
      data: [
        {
          id: 1,
          order_number: 'A-1',
          channel: 'dine_in',
          table_number: null,
          status: 'paid',
          note: null,
          items: [],
          discounts: [],
          subtotal: '100.00',
          discount_total: '0.00',
          service_charge: '0.00',
          tax_total: '0.00',
          total: '100.00',
          paid_total: '100.00',
          change_due: '0.00',
          sent_to_kitchen_at: null,
          void_reason: null,
          created_at: '2026-05-01T03:00:00Z',
        },
      ],
      isPending: false,
    }),
    useOrder: () => ({ data: undefined, isPending: false }),
    useSendToKitchen: stub,
    useVoidItem: stub,
    useVoidOrder: stub,
    useApplyOrderDiscount: stub,
    useRemoveOrderDiscount: stub,
  }
})
vi.mock('@/features/pos/api/products', () => ({
  useProducts: () => ({ data: [], isPending: false }),
}))

import { OrdersPage } from '@/features/admin/OrdersPage'

describe('OrdersPage', () => {
  it('lists orders with number and status label', () => {
    render(<OrdersPage />)
    expect(screen.getByText('A-1')).toBeInTheDocument()
    // Channel label is row-only (status text also appears in the filter dropdown).
    expect(screen.getByText('ทานที่ร้าน')).toBeInTheDocument()
  })
})
