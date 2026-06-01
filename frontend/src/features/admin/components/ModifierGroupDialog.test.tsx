import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ModifierGroupDialog } from '@/features/admin/components/ModifierGroupDialog'

describe('ModifierGroupDialog', () => {
  it('submits a new group with one modifier', async () => {
    const onSubmit = vi.fn()
    render(<ModifierGroupDialog open onOpenChange={() => {}} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('ชื่อกลุ่ม'), 'ความหวาน')
    await userEvent.type(screen.getByPlaceholderText('ชื่อตัวเลือก'), 'หวานน้อย')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'ความหวาน',
      min_select: 0,
      max_select: 1,
      is_required: false,
      modifiers: [{ name: 'หวานน้อย', price_delta: 0 }],
    })
  })
})
