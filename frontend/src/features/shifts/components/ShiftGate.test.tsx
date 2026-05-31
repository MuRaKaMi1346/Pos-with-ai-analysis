import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useCurrentShift } from '@/features/shifts/api/shifts'
import { ShiftGate } from '@/features/shifts/components/ShiftGate'

vi.mock('@/features/shifts/api/shifts', () => ({ useCurrentShift: vi.fn() }))

function renderGate() {
  render(
    <MemoryRouter initialEntries={['/pos']}>
      <Routes>
        <Route element={<ShiftGate />}>
          <Route path="/pos" element={<div>POS CONTENT</div>} />
        </Route>
        <Route path="/shift" element={<div>SHIFT PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ShiftGate', () => {
  it('renders the POS when a shift is open', () => {
    vi.mocked(useCurrentShift).mockReturnValue({
      data: { id: 1 },
      isPending: false,
    } as unknown as ReturnType<typeof useCurrentShift>)
    renderGate()
    expect(screen.getByText('POS CONTENT')).toBeInTheDocument()
  })

  it('redirects to /shift when no shift is open', () => {
    vi.mocked(useCurrentShift).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof useCurrentShift>)
    renderGate()
    expect(screen.getByText('SHIFT PAGE')).toBeInTheDocument()
  })

  it('shows a loading state while checking', () => {
    vi.mocked(useCurrentShift).mockReturnValue({
      data: undefined,
      isPending: true,
    } as unknown as ReturnType<typeof useCurrentShift>)
    renderGate()
    expect(screen.getByText(/กำลังตรวจสอบกะ/)).toBeInTheDocument()
  })
})
