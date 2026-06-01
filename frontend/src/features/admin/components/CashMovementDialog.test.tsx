import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CashMovementDialog } from '@/features/admin/components/CashMovementDialog'

describe('CashMovementDialog', () => {
  it('submits a pay-in with the entered amount', async () => {
    const onSubmit = vi.fn()
    render(<CashMovementDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('จำนวนเงิน (บาท)'), '200')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    expect(onSubmit).toHaveBeenCalledWith({ type: 'pay_in', amount: 200, reason: null })
  })
})
