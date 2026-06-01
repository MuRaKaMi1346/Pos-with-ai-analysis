import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const useCashMovements = vi.fn()
vi.mock('@/features/admin/api/cashDrawer', () => ({
  useCashMovements: () => useCashMovements(),
  useRecordCashMovement: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { CashDrawerPage } from '@/features/admin/CashDrawerPage'

describe('CashDrawerPage', () => {
  it('shows the no-open-shift prompt when the movements query errors', () => {
    useCashMovements.mockReturnValue({ data: undefined, isPending: false, isError: true })
    render(<CashDrawerPage />)
    expect(screen.getByText(/ยังไม่มีกะที่เปิดอยู่/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /บันทึกเงินเข้า\/ออก/ })).toBeDisabled()
  })

  it('lists movements with a signed amount when a shift is open', () => {
    useCashMovements.mockReturnValue({
      data: [
        { id: 1, cashier_shift_id: 1, type: 'pay_out', amount: '150.00', reason: 'ค่านม', user_id: 2, created_at: '2026-05-01T03:00:00Z' },
      ],
      isPending: false,
      isError: false,
    })
    render(<CashDrawerPage />)
    expect(screen.getByText('ค่านม')).toBeInTheDocument()
    expect(screen.getByText('เงินออก')).toBeInTheDocument()
  })
})
