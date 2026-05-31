import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '@/features/pos/components/CommandPalette'
import type { Product } from '@/types/product'

function product(id: number, name: string, over: Partial<Product> = {}): Product {
  return {
    id,
    name,
    category_id: null,
    price: '50.00',
    cost: '0',
    image: null,
    sku: null,
    barcode: null,
    is_active: true,
    has_modifiers: false,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const latte = product(1, 'Latte')
const mocha = product(2, 'Mocha', { barcode: '999' })

interface SetupOpts {
  lookup?: (code: string) => Promise<Product | null>
  onSelect?: (product: Product) => void
}

function setup(opts: SetupOpts = {}) {
  const onSelect = opts.onSelect ?? vi.fn()
  const lookup = opts.lookup ?? vi.fn().mockResolvedValue(null)
  render(
    <CommandPalette
      open
      onOpenChange={vi.fn()}
      products={[latte, mocha]}
      lookup={lookup}
      onSelect={onSelect}
    />,
  )
  return { onSelect, lookup }
}

describe('CommandPalette', () => {
  it('lists products and filters by name', async () => {
    setup()
    expect(screen.getByRole('button', { name: /Latte/ })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'moc')
    expect(screen.queryByRole('button', { name: /Latte/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mocha/ })).toBeInTheDocument()
  })

  it('adds the scanned product when a barcode resolves on Enter', async () => {
    const lookup = vi.fn().mockResolvedValue(mocha)
    const { onSelect } = setup({ lookup })
    await userEvent.type(screen.getByRole('textbox'), '999{Enter}')
    expect(lookup).toHaveBeenCalledWith('999')
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(mocha)
    })
  })

  it('falls back to the top name match when the code is unknown', async () => {
    const { onSelect } = setup()
    await userEvent.type(screen.getByRole('textbox'), 'latte{Enter}')
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(latte)
    })
  })

  it('adds a product when its row is clicked', async () => {
    const { onSelect } = setup()
    await userEvent.click(screen.getByRole('button', { name: /Latte/ }))
    expect(onSelect).toHaveBeenCalledWith(latte)
  })
})
