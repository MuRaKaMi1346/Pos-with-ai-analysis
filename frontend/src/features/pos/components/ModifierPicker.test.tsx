import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ModifierPicker } from '@/features/pos/components/ModifierPicker'
import type { ModifierGroup, ModifierOption } from '@/types/modifier'

function option(id: number, name: string, delta = '0.00'): ModifierOption {
  return { id, name, price_delta: delta, sort_order: id, is_active: true }
}

const sizeGroup: ModifierGroup = {
  id: 1,
  name: 'Size',
  min_select: 1,
  max_select: 1,
  is_required: true,
  sort_order: 0,
  modifiers: [option(1, 'Small'), option(2, 'Large', '10.00')],
}
const extrasGroup: ModifierGroup = {
  id: 2,
  name: 'Extras',
  min_select: 0,
  max_select: 2,
  is_required: false,
  sort_order: 1,
  modifiers: [option(10, 'Extra shot', '10.00'), option(11, 'Oat'), option(12, 'Whip')],
}

describe('ModifierPicker', () => {
  it('renders groups, options, the required badge, and price deltas', () => {
    render(
      <ModifierPicker groups={[sizeGroup, extrasGroup]} selectedIds={[]} onToggle={() => {}} />,
    )
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('จำเป็น')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Small/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Extra shot/ })).toBeInTheDocument()
    expect(screen.getAllByText(/10\.00/).length).toBeGreaterThan(0)
  })

  it('marks the selected option via aria-checked', () => {
    render(<ModifierPicker groups={[sizeGroup]} selectedIds={[2]} onToggle={() => {}} />)
    expect(screen.getByRole('radio', { name: /Large/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Small/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onToggle with the group + modifier id', async () => {
    const onToggle = vi.fn()
    render(<ModifierPicker groups={[extrasGroup]} selectedIds={[]} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Oat/ }))
    expect(onToggle).toHaveBeenCalledWith(extrasGroup, 11)
  })

  it('disables unselected options once max_select is reached', () => {
    render(<ModifierPicker groups={[extrasGroup]} selectedIds={[10, 11]} onToggle={() => {}} />)
    expect(screen.getByRole('checkbox', { name: /Whip/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Extra shot/ })).not.toBeDisabled()
  })
})
