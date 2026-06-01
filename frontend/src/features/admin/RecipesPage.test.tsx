import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/recipes', () => ({
  useRecipes: () => ({
    data: [{ id: 1, product_id: 5, modifier_id: null, ingredient_id: 3, qty: '150.0000', unit: 'ml' }],
    isPending: false,
  }),
  useCreateRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRecipe: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/admin/api/ingredients', () => ({
  useIngredients: () => ({
    data: [
      { id: 3, name: 'นมสด', unit: 'ml', shelf_life_days: null, is_active: true, created_at: '', updated_at: '' },
    ],
    isPending: false,
  }),
}))
vi.mock('@/features/pos/api/products', () => ({
  useProducts: () => ({
    data: [{ id: 5, name: 'ลาเต้', is_active: true }],
    isPending: false,
  }),
}))

import { RecipesPage } from '@/features/admin/RecipesPage'

describe('RecipesPage', () => {
  it('prompts to pick a product, then shows that product BOM lines', async () => {
    render(<RecipesPage />)
    expect(screen.getByText('เลือกเมนูเพื่อดูและแก้ไขสูตร')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('เลือกเมนู'), '5')
    expect(screen.getByText('นมสด')).toBeInTheDocument()
  })
})
