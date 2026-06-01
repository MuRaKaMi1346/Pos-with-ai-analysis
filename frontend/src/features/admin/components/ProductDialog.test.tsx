import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProductDialog } from '@/features/admin/components/ProductDialog'
import type { Category } from '@/types/product'

const categories: Category[] = [{ id: 1, name: 'กาแฟ', default_station: 'bar' }]

describe('ProductDialog', () => {
  it('submits a new product with price and selected category', async () => {
    const onSubmit = vi.fn()
    render(
      <ProductDialog open onOpenChange={() => {}} categories={categories} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByLabelText('ชื่อสินค้า'), 'ลาเต้')
    await userEvent.selectOptions(screen.getByLabelText('หมวด'), '1')
    const price = screen.getByLabelText('ราคาขาย (บาท)')
    await userEvent.clear(price)
    await userEvent.type(price, '65')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'ลาเต้',
      category_id: 1,
      price: 65,
      cost: 0,
      image: null,
      sku: null,
      barcode: null,
    })
  })
})
