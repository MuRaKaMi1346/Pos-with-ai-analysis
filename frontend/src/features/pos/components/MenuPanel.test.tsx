import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MenuPanel } from '@/features/pos/components/MenuPanel'
import type { Product } from '@/types/product'

function makeProduct(id: number, name: string): Product {
  return {
    id,
    name,
    category_id: 1,
    price: '50.00',
    cost: '10.00',
    image: null,
    is_active: true,
    sku: null,
    barcode: null,
    has_modifiers: false,
    created_at: '',
    updated_at: '',
  }
}

const products = [makeProduct(1, 'Latte'), makeProduct(2, 'Espresso')]

function setup(over: Partial<Parameters<typeof MenuPanel>[0]> = {}) {
  const onQueryChange = vi.fn()
  const onAdd = vi.fn()
  render(
    <MenuPanel
      products={products}
      query=""
      onQueryChange={onQueryChange}
      onAdd={onAdd}
      isPending={false}
      isError={false}
      {...over}
    />,
  )
  return { onQueryChange, onAdd }
}

describe('MenuPanel', () => {
  it('renders one card per product', () => {
    setup()
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Espresso')).toBeInTheDocument()
  })

  it('shows a skeleton (and no products) while pending', () => {
    setup({ isPending: true })
    expect(screen.queryByText('Latte')).not.toBeInTheDocument()
  })

  it('shows an error message and illustration on failure', () => {
    setup({ isError: true })
    expect(screen.getByText(/โหลดเมนูไม่สำเร็จ/)).toBeInTheDocument()
    expect(screen.getByTestId('menu-error-illustration')).toBeInTheDocument()
  })

  it('shows a no-match empty state with an illustration when a query returns nothing', () => {
    setup({ products: [], query: 'xyz' })
    expect(screen.getByText(/ไม่พบเมนูที่ตรงกับ/)).toBeInTheDocument()
    expect(screen.getByTestId('empty-menu-illustration')).toBeInTheDocument()
  })

  it('reports typing through onQueryChange', async () => {
    const { onQueryChange } = setup()
    await userEvent.type(screen.getByLabelText('ค้นหาเมนู'), 'a')
    expect(onQueryChange).toHaveBeenCalledWith('a')
  })

  it('adds a product when its card is tapped', async () => {
    const { onAdd } = setup()
    await userEvent.click(screen.getByRole('button', { name: /latte/i }))
    expect(onAdd).toHaveBeenCalledWith(products[0])
  })
})
