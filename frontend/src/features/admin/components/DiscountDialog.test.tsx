import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DiscountDialog } from '@/features/admin/components/DiscountDialog'

describe('DiscountDialog', () => {
  it('submits a new percent discount', async () => {
    const onSubmit = vi.fn()
    render(<DiscountDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อ'), 'สมาชิก')
    const value = screen.getByLabelText('มูลค่า')
    await userEvent.clear(value)
    await userEvent.type(value, '0.1')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    expect(onSubmit).toHaveBeenCalledWith({
      code: null,
      name: 'สมาชิก',
      scope: 'order',
      type: 'percent',
      value: 0.1,
      min_order_amount: null,
      max_discount_amount: null,
      requires_admin: false,
    })
  })

  it('rejects a percent value above 1', async () => {
    const onSubmit = vi.fn()
    render(<DiscountDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('ชื่อ'), 'ผิด')
    const value = screen.getByLabelText('มูลค่า')
    await userEvent.clear(value)
    await userEvent.type(value, '5')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
