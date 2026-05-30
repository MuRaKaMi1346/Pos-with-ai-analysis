import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CategoryRail } from '@/features/pos/components/CategoryRail'
import type { Category } from '@/types/product'

const categories: Category[] = [
  { id: 1, name: 'Coffee', default_station: 'bar' },
  { id: 2, name: 'Food', default_station: 'kitchen' },
]

function renderRail(over: Partial<Parameters<typeof CategoryRail>[0]> = {}) {
  const onSelect = vi.fn()
  render(
    <CategoryRail
      categories={categories}
      counts={{ 1: 3, 2: 5 }}
      totalCount={8}
      selectedId={null}
      onSelect={onSelect}
      {...over}
    />,
  )
  return { onSelect }
}

describe('CategoryRail', () => {
  it('renders an "All" entry plus every category with its count', () => {
    renderRail()
    expect(screen.getByRole('button', { name: /ทั้งหมด/ })).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('marks the selected category as active', () => {
    renderRail({ selectedId: 1 })
    expect(screen.getByRole('button', { name: /Coffee/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /ทั้งหมด/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a category by id when tapped', async () => {
    const { onSelect } = renderRail()
    await userEvent.click(screen.getByRole('button', { name: /Food/ }))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('selects null for the "All" entry', async () => {
    const { onSelect } = renderRail({ selectedId: 1 })
    await userEvent.click(screen.getByRole('button', { name: /ทั้งหมด/ }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
