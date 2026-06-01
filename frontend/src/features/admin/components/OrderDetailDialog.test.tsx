import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/orders', () => {
  const order = {
    id: 5,
    order_number: 'A-5',
    channel: 'dine_in',
    table_number: null,
    status: 'open',
    note: null,
    items: [
      { id: 11, product_id: 3, qty: 1, unit_price: '65.00', is_voided: false, voided_reason: null },
    ],
    discounts: [],
    subtotal: '65.00',
    discount_total: '0.00',
    service_charge: '0.00',
    tax_total: '0.00',
    total: '65.00',
    paid_total: '0.00',
    change_due: '0.00',
    sent_to_kitchen_at: null,
    void_reason: null,
    created_at: '',
  }
  const stub = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useOrder: () => ({ data: order, isPending: false }),
    useSendToKitchen: stub,
    useVoidItem: stub,
    useVoidOrder: stub,
    useApplyOrderDiscount: stub,
    useRemoveOrderDiscount: stub,
  }
})
vi.mock('@/features/pos/api/products', () => ({
  useProducts: () => ({ data: [{ id: 3, name: 'ลาเต้', is_active: true }], isPending: false }),
}))

import { OrderDetailDialog } from '@/features/admin/components/OrderDetailDialog'

describe('OrderDetailDialog', () => {
  it('shows items and lifecycle actions for an open order', () => {
    render(<OrderDetailDialog orderId={5} onOpenChange={() => {}} />)
    expect(screen.getByText('ลาเต้')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ส่งเข้าครัว/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ยกเลิกทั้งบิล/ })).toBeInTheDocument()
  })
})
