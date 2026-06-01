import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OrderDiscountDialog } from '@/features/admin/components/OrderDiscountDialog'

describe('OrderDiscountDialog', () => {
  it('submits an ad-hoc percent discount with a reason', async () => {
    const onSubmit = vi.fn()
    render(<OrderDiscountDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อส่วนลด'), 'ลดวันเกิด')
    const value = screen.getByLabelText('มูลค่า')
    await userEvent.clear(value)
    await userEvent.type(value, '0.2')
    await userEvent.type(screen.getByLabelText('เหตุผล'), 'โปรวันเกิด')
    await userEvent.click(screen.getByRole('button', { name: 'ใช้ส่วนลด' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'ลดวันเกิด',
      type: 'percent',
      value: 0.2,
      reason: 'โปรวันเกิด',
    })
  })
})
