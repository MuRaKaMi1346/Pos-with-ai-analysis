import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducedMotion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TicketLineRow } from '@/features/pos/components/TicketLineRow'
import type { TicketLine } from '@/features/pos/stores/cartStore'

// Keep framer-motion real except useReducedMotion, which we drive per test.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => false) }
})

const line: TicketLine = {
  uid: 'a',
  product: {
    id: 1,
    name: 'Latte',
    category_id: 1,
    price: '65.00',
    cost: '18.00',
    image: null,
    is_active: true,
    sku: null,
    barcode: null,
    has_modifiers: false,
    created_at: '',
    updated_at: '',
  },
  qty: 2,
  unit_price: 65,
  modifiers: [{ modifier_id: 9, name: 'หวานน้อย', price_delta: 0 }],
  note: 'ไม่ใส่น้ำแข็ง',
}

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

describe('TicketLineRow', () => {
  it('shows qty, name, modifiers, note and subtotal', () => {
    render(<TicketLineRow line={line} onClick={() => {}} />)
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('หวานน้อย')).toBeInTheDocument()
    expect(screen.getByText(/ไม่ใส่น้ำแข็ง/)).toBeInTheDocument()
    expect(screen.getByText(/130\.00/)).toBeInTheDocument() // 65 × 2
  })

  it('calls onClick when tapped', async () => {
    const onClick = vi.fn()
    render(<TicketLineRow line={line} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('still renders the qty under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    render(<TicketLineRow line={line} onClick={() => {}} />)
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
  })
})
