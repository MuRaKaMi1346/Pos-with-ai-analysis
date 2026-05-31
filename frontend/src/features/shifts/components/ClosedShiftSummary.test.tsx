import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ClosedShiftSummary } from '@/features/shifts/components/ClosedShiftSummary'
import type { Shift } from '@/types/shift'

function shift(variance: string): Shift {
  return {
    id: 1,
    user_id: 1,
    opening_float: '1000.00',
    closing_cash_counted: '1450.00',
    expected_cash: '1455.00',
    cash_variance: variance,
    closing_note: null,
    opened_at: '',
    closed_at: '2026-05-31T09:00:00Z',
    is_open: false,
  }
}

describe('ClosedShiftSummary', () => {
  it('shows expected vs counted and a shortage variance', () => {
    render(<ClosedShiftSummary shift={shift('-5.00')} onReset={vi.fn()} />)
    expect(screen.getByText('เงินที่ควรมี')).toBeInTheDocument()
    expect(screen.getByText('เงินที่นับได้')).toBeInTheDocument()
    expect(screen.getByText(/ขาด/)).toBeInTheDocument()
  })

  it('labels an exact count and resets on tap', async () => {
    const onReset = vi.fn()
    render(<ClosedShiftSummary shift={shift('0.00')} onReset={onReset} />)
    expect(screen.getByText(/ตรง/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'เปิดกะใหม่' }))
    expect(onReset).toHaveBeenCalled()
  })
})
