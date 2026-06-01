import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/ingredients', () => ({
  useIngredients: () => ({
    data: [
      {
        id: 1,
        name: 'นมสด',
        unit: 'ml',
        shelf_life_days: 7,
        is_active: true,
        created_at: '',
        updated_at: '',
      },
    ],
    isPending: false,
  }),
  useCreateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeactivateIngredient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { IngredientsPage } from '@/features/admin/IngredientsPage'

describe('IngredientsPage', () => {
  it('lists ingredients with their unit label', () => {
    render(<IngredientsPage />)
    expect(screen.getByText('นมสด')).toBeInTheDocument()
    expect(screen.getByText('มิลลิลิตร (ml)')).toBeInTheDocument()
  })

  it('opens the create dialog from the header button', async () => {
    render(<IngredientsPage />)
    await userEvent.click(screen.getByRole('button', { name: /เพิ่มวัตถุดิบ/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
