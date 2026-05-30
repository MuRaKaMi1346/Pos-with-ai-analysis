import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductModifiers } from '@/features/pos/api/products'
import { ModifierDialog } from '@/features/pos/components/ModifierDialog'
import type { ModifierGroup } from '@/types/modifier'
import type { Product } from '@/types/product'

vi.mock('@/features/pos/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/pos/api/products')>()
  return { ...actual, useProductModifiers: vi.fn() }
})

const product: Product = {
  id: 1,
  name: 'Latte',
  category_id: null,
  price: '65.00',
  cost: '0',
  image: null,
  is_active: true,
  has_modifiers: true,
  created_at: '',
  updated_at: '',
}

const sizeGroup: ModifierGroup = {
  id: 1,
  name: 'Size',
  min_select: 1,
  max_select: 1,
  is_required: true,
  sort_order: 0,
  modifiers: [
    { id: 1, name: 'Small', price_delta: '0.00', sort_order: 0, is_active: true },
    { id: 2, name: 'Large', price_delta: '10.00', sort_order: 1, is_active: true },
  ],
}

function mockGroups(
  groups: ModifierGroup[],
  opts: { isPending?: boolean; isError?: boolean } = {},
): void {
  vi.mocked(useProductModifiers).mockReturnValue({
    data: groups,
    isPending: opts.isPending ?? false,
    isError: opts.isError ?? false,
  } as unknown as ReturnType<typeof useProductModifiers>)
}

beforeEach(() => {
  vi.mocked(useProductModifiers).mockReset()
})

describe('ModifierDialog', () => {
  it('renders the product groups with the base running price', () => {
    mockGroups([sizeGroup])
    render(<ModifierDialog product={product} open onOpenChange={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Small/ })).toBeInTheDocument()
    expect(screen.getByText(/65\.00/)).toBeInTheDocument()
  })

  it('keeps confirm disabled until the required group is satisfied, then emits the selection', async () => {
    mockGroups([sizeGroup])
    const onConfirm = vi.fn()
    render(<ModifierDialog product={product} open onOpenChange={() => {}} onConfirm={onConfirm} />)

    const confirm = screen.getByRole('button', { name: 'เพิ่มลงตะกร้า' })
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: /Large/ }))
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith(
      [{ modifier_id: 2, name: 'Large', price_delta: 10 }],
      undefined,
    )
  })

  it('shows a loading state while options are fetching', () => {
    mockGroups([], { isPending: true })
    render(<ModifierDialog product={product} open onOpenChange={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText(/กำลังโหลดตัวเลือก/)).toBeInTheDocument()
  })
})
