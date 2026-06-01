import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { IngredientDialog } from '@/features/admin/components/IngredientDialog'
import type { Ingredient } from '@/types/ingredient'

const milk: Ingredient = {
  id: 1,
  name: 'นมสด',
  unit: 'ml',
  shelf_life_days: 7,
  is_active: true,
  created_at: '',
  updated_at: '',
}

describe('IngredientDialog', () => {
  it('submits create values with the unit default and null shelf life', async () => {
    const onSubmit = vi.fn()
    render(<IngredientDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อวัตถุดิบ'), 'เมล็ดกาแฟ')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'เมล็ดกาแฟ',
      unit: 'g',
      shelf_life_days: null,
    })
  })

  it('prefills fields in edit mode', () => {
    render(<IngredientDialog open onOpenChange={() => {}} initial={milk} onSubmit={() => {}} />)
    expect(screen.getByRole('heading', { name: 'แก้ไขวัตถุดิบ' })).toBeInTheDocument()
    expect(screen.getByLabelText('ชื่อวัตถุดิบ')).toHaveValue('นมสด')
  })

  it('blocks submit and shows an error when the name is empty', async () => {
    const onSubmit = vi.fn()
    render(<IngredientDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('จำเป็นต้องใส่ชื่อ')
  })
})
