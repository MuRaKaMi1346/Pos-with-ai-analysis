import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

// Stable references so the order-reset effect doesn't loop.
const ORDER = {
  id: 5,
  order_number: 'A-5',
  channel: 'dine_in',
  table_number: null,
  total: '100.00',
  status: 'paid',
  user_id: 1,
  note: null,
  items: [{ id: 11, product_id: 3, qty: 2, unit_price: '50.00', modifiers: [] }],
  paid_total: '100.00',
  change_due: '0.00',
  created_at: '',
  updated_at: '',
}
vi.mock('@/features/admin/api/refunds', () => ({
  useOrderLookup: () => ({ data: ORDER, isPending: false, isError: false }),
}))
vi.mock('@/features/pos/api/products', () => ({
  useProducts: () => ({ data: [{ id: 3, name: 'ลาเต้', is_active: true }], isPending: false }),
}))

import { RefundCreateDialog } from '@/features/admin/components/RefundCreateDialog'

describe('RefundCreateDialog', () => {
  it('submits the chosen line quantities for the looked-up order', async () => {
    const onSubmit = vi.fn()
    render(<RefundCreateDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('หมายเลขบิล (order id)'), '5')
    const qty = screen.getByLabelText('จำนวนที่คืน')
    await userEvent.clear(qty)
    await userEvent.type(qty, '1')
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันคืนเงิน' }))

    expect(onSubmit).toHaveBeenCalledWith({
      order_id: 5,
      items: [{ order_item_id: 11, qty: 1, restock: true }],
      reason: null,
    })
  })
})
