import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProductCard } from '@/features/pos/components/ProductCard'
import type { Product } from '@/types/product'

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
})
