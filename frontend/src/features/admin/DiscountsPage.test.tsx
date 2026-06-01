import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/discounts', () => ({
  useDiscounts: () => ({
    data: [
      {
        id: 1,
        code: 'MEM',
        name: 'สมาชิก',
        scope: 'order',
        type: 'percent',
        value: '0.1',
        starts_at: null,
        ends_at: null,
        min_order_amount: null,
        max_discount_amount: null,
        requires_admin: false,
        is_active: true,
        created_at: '',
      },
    ],
    isPending: false,
  }),
  useCreateDiscount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDiscount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeactivateDiscount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { DiscountsPage } from '@/features/admin/DiscountsPage'

describe('DiscountsPage', () => {
  it('lists discounts with a formatted percent value', () => {
    render(<DiscountsPage />)
    expect(screen.getByText('สมาชิก')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('opens the create dialog', async () => {
    render(<DiscountsPage />)
    await userEvent.click(screen.getByRole('button', { name: /เพิ่มส่วนลด/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
