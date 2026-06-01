import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RecipeLineDialog } from '@/features/admin/components/RecipeLineDialog'
import type { Ingredient } from '@/types/ingredient'

const ingredients: Ingredient[] = [
  { id: 3, name: 'นมสด', unit: 'ml', shelf_life_days: null, is_active: true, created_at: '', updated_at: '' },
]

describe('RecipeLineDialog', () => {
  it('submits the ingredient, quantity and its unit', async () => {
    const onSubmit = vi.fn()
    render(
      <RecipeLineDialog open onOpenChange={() => {}} ingredients={ingredients} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByLabelText('ปริมาณ'), '150')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    expect(onSubmit).toHaveBeenCalledWith({ ingredient_id: 3, qty: 150, unit: 'ml' })
  })
})
