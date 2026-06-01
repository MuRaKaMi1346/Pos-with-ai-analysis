import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/modifierGroups', () => ({
  useModifierGroups: () => ({
    data: [
      {
        id: 1,
        name: 'ความหวาน',
        min_select: 1,
        max_select: 1,
        is_required: true,
        sort_order: 0,
        modifiers: [
          { id: 1, name: 'หวานน้อย', price_delta: '0.00', sort_order: 0, is_active: true },
          { id: 2, name: 'หวานปกติ', price_delta: '0.00', sort_order: 1, is_active: true },
        ],
      },
    ],
    isPending: false,
  }),
  useCreateModifierGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateModifierGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteModifierGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import { ModifierGroupsPage } from '@/features/admin/ModifierGroupsPage'

describe('ModifierGroupsPage', () => {
  it('lists groups with their modifier summary', () => {
    render(<ModifierGroupsPage />)
    expect(screen.getByText('ความหวาน')).toBeInTheDocument()
    expect(screen.getByText(/2 ตัวเลือก/)).toBeInTheDocument()
  })

  it('opens the create dialog', async () => {
    render(<ModifierGroupsPage />)
    await userEvent.click(screen.getByRole('button', { name: /เพิ่มกลุ่ม/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
