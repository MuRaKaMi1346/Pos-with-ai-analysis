import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCloseShift } from '@/features/shifts/api/shifts'
import { CloseShiftForm } from '@/features/shifts/components/CloseShiftForm'
import type { Shift } from '@/types/shift'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/shifts/api/shifts', () => ({ useCloseShift: vi.fn() }))

const shift: Shift = {
  id: 1,
  user_id: 1,
  opening_float: '1000.00',
  closing_cash_counted: null,
  expected_cash: null,
  cash_variance: null,
  closing_note: null,
  opened_at: '2026-05-31T01:00:00Z',
  closed_at: null,
  is_open: true,
}
const mutateAsync = vi.fn()

beforeEach(() => {
  mutateAsync.mockReset()
  vi.mocked(useCloseShift).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCloseShift>)
})

describe('CloseShiftForm', () => {
  it('shows the opening float', () => {
    render(<CloseShiftForm shift={shift} onClosed={vi.fn()} />)
    expect(screen.getByText('เงินตั้งต้น')).toBeInTheDocument()
  })

  it('closes with the counted cash + note and reports the result', async () => {
    const closed: Shift = {
      ...shift,
      closing_cash_counted: '1450.00',
      expected_cash: '1455.00',
      cash_variance: '-5.00',
    }
    mutateAsync.mockResolvedValue(closed)
    const onClosed = vi.fn()
    render(<CloseShiftForm shift={shift} onClosed={onClosed} />)
    await userEvent.type(screen.getByLabelText('เงินสดที่นับได้'), '1450')
    await userEvent.type(screen.getByLabelText('หมายเหตุปิดกะ'), 'end of day')
    await userEvent.click(screen.getByRole('button', { name: 'ปิดกะ' }))
    expect(mutateAsync).toHaveBeenCalledWith({
      closing_cash_counted: 1450,
      closing_note: 'end of day',
    })
    await waitFor(() => {
      expect(onClosed).toHaveBeenCalledWith(closed)
    })
  })
})
