import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/admin/api/products', () => ({
  useAdminProducts: () => ({
    data: [
      {
        id: 1,
        name: 'ลาเต้',
        category_id: 1,
        price: '65.00',
        cost: '18.00',
        image: null,
        sku: 'LAT',
        barcode: null,
        is_active: true,
        has_modifiers: false,
        created_at: '',
        updated_at: '',
      },
    ],
    isPending: false,
  }),
  useCreateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeactivateProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadProductImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/pos/api/products', () => ({
  useCategories: () => ({ data: [{ id: 1, name: 'กาแฟ', default_station: 'bar' }] }),
}))

import { ProductsPage } from '@/features/admin/ProductsPage'

describe('ProductsPage', () => {
  it('lists products with category name and price', () => {
    render(<ProductsPage />)
    expect(screen.getByText('ลาเต้')).toBeInTheDocument()
    expect(screen.getByText('กาแฟ')).toBeInTheDocument()
  })

  it('opens the create dialog', async () => {
    render(<ProductsPage />)
    await userEvent.click(screen.getByRole('button', { name: /เพิ่มสินค้า/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
