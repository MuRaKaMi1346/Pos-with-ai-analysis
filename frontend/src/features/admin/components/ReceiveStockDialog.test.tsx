import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReceiveStockDialog } from '@/features/admin/components/ReceiveStockDialog'
import type { Ingredient } from '@/types/ingredient'

const ingredients: Ingredient[] = [
  { id: 3, name: 'นมสด', unit: 'ml', shelf_life_days: null, is_active: true, created_at: '', updated_at: '' },
]

describe('ReceiveStockDialog', () => {
  it('submits the selected ingredient and entered quantity', async () => {
    const onSubmit = vi.fn()
    render(
      <ReceiveStockDialog
        open
        onOpenChange={() => {}}
        ingredients={ingredients}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.type(screen.getByLabelText('จำนวน'), '500')
    await userEvent.click(screen.getByRole('button', { name: 'รับเข้า' }))

    expect(onSubmit).toHaveBeenCalledWith({
      ingredient_id: 3,
      qty: 500,
      ref: null,
      note: null,
    })
  })
})
