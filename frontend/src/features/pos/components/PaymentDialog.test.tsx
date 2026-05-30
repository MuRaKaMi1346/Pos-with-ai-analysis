import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PaymentDialog } from '@/features/pos/components/PaymentDialog'

function setup(over: Partial<Parameters<typeof PaymentDialog>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue({ orderNumber: '20260530-0001', changeDue: 35 })
  const onDone = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <PaymentDialog
      open
      onOpenChange={onOpenChange}
      total={65}
      onSubmit={onSubmit}
      onDone={onDone}
      {...over}
    />,
  )
  return { onSubmit, onDone, onOpenChange }
}

/** Type a whole number on the keypad. */
async function keypad(digits: string): Promise<void> {
  for (const d of digits) {
    await userEvent.click(screen.getByRole('button', { name: d }))
  }
}

describe('PaymentDialog', () => {
  it('shows the amount due and keeps submit disabled until covered', () => {
    setup()
    expect(screen.getByText('ยอดที่ต้องชำระ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ยืนยันการชำระเงิน/ })).toBeDisabled()
  })

  it('cash overpayment adds a tender, shows change, and submits', async () => {
    const { onSubmit } = setup()
    await keypad('100')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการชำระ' }))
    expect(screen.getAllByText(/35\.00/).length).toBeGreaterThan(0)

    const submit = screen.getByRole('button', { name: /ยืนยันการชำระเงิน/ })
    expect(submit).toBeEnabled()
    await userEvent.click(submit)
    expect(onSubmit).toHaveBeenCalledWith([{ method: 'cash', amount: 65, tendered_amount: 100 }])
    await waitFor(() => {
      expect(screen.getByText('ชำระเงินสำเร็จ')).toBeInTheDocument()
    })
  })

  it('requires a reference before a card tender can be added', async () => {
    setup({ total: 130 })
    await userEvent.click(screen.getByRole('button', { name: 'บัตร' }))
    const add = screen.getByRole('button', { name: 'เพิ่มรายการชำระ' })
    expect(add).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), '4242')
    expect(add).toBeEnabled()
  })

  it('New sale on the success screen calls onDone', async () => {
    const { onDone } = setup()
    await keypad('100')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการชำระ' }))
    await userEvent.click(screen.getByRole('button', { name: /ยืนยันการชำระเงิน/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'ขายใหม่' }))
    expect(onDone).toHaveBeenCalled()
  })
})
