import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/inventory', () => ({
  useStockLevels: () => ({
    data: [{ id: 1, ingredient_id: 3, quantity: '1200.0000', reorder_point: '500', updated_at: '' }],
    isPending: false,
  }),
  useReceiveStock: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStockMovements: () => ({
    data: [
      {
        id: 9,
        ingredient_id: 3,
        type: 'receive',
        qty: '500.0000',
        ref: 'PO-1',
        note: null,
        user_id: 1,
        created_at: '2026-05-01T03:00:00Z',
      },
    ],
    isPending: false,
  }),
}))
vi.mock('@/features/admin/api/ingredients', () => ({
  useIngredients: () => ({
    data: [
      { id: 3, name: 'นมสด', unit: 'ml', shelf_life_days: null, is_active: true, created_at: '', updated_at: '' },
    ],
    isPending: false,
  }),
}))

import { InventoryPage } from '@/features/admin/InventoryPage'

describe('InventoryPage', () => {
  it('resolves ingredient names and renders the movements section', () => {
    render(<InventoryPage />)
    // Name appears in both the stock table and the movement row.
    expect(screen.getAllByText('นมสด').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'ความเคลื่อนไหวล่าสุด' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /รับเข้าสต็อก/ })).toBeInTheDocument()
  })
})
