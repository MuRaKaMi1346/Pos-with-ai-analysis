import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducedMotion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductCard } from '@/features/pos/components/ProductCard'
import type { Product } from '@/types/product'

// Keep all of framer-motion real except useReducedMotion, which we drive per test.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => false) }
})

const latte: Product = {
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
}

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

describe('ProductCard', () => {
  it('renders the product name and price', () => {
    render(<ProductCard product={latte} onAdd={() => {}} />)
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText(/65\.00/)).toBeInTheDocument()
  })

  it('calls onAdd with the product when the card is tapped', async () => {
    const onAdd = vi.fn()
    render(<ProductCard product={latte} onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: /latte/i }))
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(latte)
  })

  it('shows a customise chip only when the product has modifiers', () => {
    const { rerender } = render(<ProductCard product={latte} onAdd={() => {}} />)
    expect(screen.queryByText('ตัวเลือก')).not.toBeInTheDocument()
    rerender(<ProductCard product={{ ...latte, has_modifiers: true }} onAdd={() => {}} />)
    expect(screen.getByText('ตัวเลือก')).toBeInTheDocument()
  })

  it('drops the parallax gloss under reduced motion but still adds to cart', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const onAdd = vi.fn()
    render(<ProductCard product={latte} onAdd={onAdd} />)
    expect(screen.queryByTestId('card-gloss')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /latte/i }))
    expect(onAdd).toHaveBeenCalledWith(latte)
  })
})
