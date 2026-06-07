import { render, screen, waitFor } from '@testing-library/react'
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

  it('uploads a picked image file and previews the returned URL', async () => {
    const onUploadImage = vi.fn().mockResolvedValue('/media/products/abc.png')
    render(
      <ProductDialog
        open
        onOpenChange={() => {}}
        categories={categories}
        onSubmit={() => {}}
        onUploadImage={onUploadImage}
      />,
    )

    const file = new File(['x'], 'latte.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('ไฟล์รูปภาพ'), file)

    expect(onUploadImage).toHaveBeenCalledWith(file)
    const preview = await screen.findByAltText('ตัวอย่างรูปสินค้า')
    expect(preview).toHaveAttribute('src', '/media/products/abc.png')
  })

  it('submits the uploaded image URL with the product', async () => {
    const onUploadImage = vi.fn().mockResolvedValue('/media/products/abc.png')
    const onSubmit = vi.fn()
    render(
      <ProductDialog
        open
        onOpenChange={() => {}}
        categories={categories}
        onSubmit={onSubmit}
        onUploadImage={onUploadImage}
      />,
    )

    await userEvent.type(screen.getByLabelText('ชื่อสินค้า'), 'มอคค่า')
    const price = screen.getByLabelText('ราคาขาย (บาท)')
    await userEvent.clear(price)
    await userEvent.type(price, '70')
    await userEvent.upload(
      screen.getByLabelText('ไฟล์รูปภาพ'),
      new File(['x'], 'm.png', { type: 'image/png' }),
    )
    await screen.findByAltText('ตัวอย่างรูปสินค้า')
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่ม' }))

    // category left as "— ไม่มีหมวด —" must submit as null (not 0, which would
    // silently fail the positive()/nullable() schema).
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'มอคค่า',
          price: 70,
          category_id: null,
          image: '/media/products/abc.png',
        }),
      )
    })
  })
})
