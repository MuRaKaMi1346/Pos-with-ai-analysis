import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HeldTicketsDrawer } from '@/features/pos/components/HeldTicketsDrawer'
import type { Order } from '@/types/order'

function order(over: Partial<Order> & Pick<Order, 'id' | 'order_number'>): Order {
  return {
    channel: 'takeaway',
    table_number: null,
    total: '120.00',
    status: 'hold',
    user_id: 1,
    note: null,
    items: [],
    paid_total: '0.00',
    change_due: '0.00',
    created_at: new Date().toISOString(),
    updated_at: '',
    ...over,
  }
}

function setup(over: Partial<Parameters<typeof HeldTicketsDrawer>[0]> = {}) {
  const onResume = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <HeldTicketsDrawer
      open
      onOpenChange={onOpenChange}
      orders={[order({ id: 1, order_number: '20260530-0001' })]}
      isPending={false}
      resumingId={null}
      onResume={onResume}
      {...over}
    />,
  )
  return { onResume, onOpenChange }
}

describe('HeldTicketsDrawer', () => {
  it('lists held bills with number + total', () => {
    setup()
    expect(screen.getByText('20260530-0001')).toBeInTheDocument()
    expect(screen.getByText(/120\.00/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no holds', () => {
    setup({ orders: [] })
    expect(screen.getByText('ไม่มีบิลที่พักไว้')).toBeInTheDocument()
  })

  it('resumes a bill when its button is tapped', async () => {
    const { onResume } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'เรียกคืนบิล' }))
    expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})
