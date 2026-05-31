import { describe, expect, it } from 'vitest'

import { orderToTicketLines } from '@/features/pos/lib/resumeOrder'
import type { OrderItemRead } from '@/types/order'
import type { Product } from '@/types/product'

function product(id: number, name: string): Product {
  return {
    id,
    name,
    category_id: null,
    price: '50.00',
    cost: '0',
    image: null,
    is_active: true,
    sku: null,
    barcode: null,
    has_modifiers: false,
    created_at: '',
    updated_at: '',
  }
}

function item(
  over: Partial<OrderItemRead> & Pick<OrderItemRead, 'id' | 'product_id'>,
): OrderItemRead {
  return { qty: 1, unit_price: '50.00', modifiers: [], ...over }
}

const latte = product(1, 'Latte')

describe('orderToTicketLines', () => {
  it('rebuilds lines with product details + resolved modifier names', () => {
    const result = orderToTicketLines(
      [
        item({
          id: 1,
          product_id: 1,
          qty: 2,
          unit_price: '65.00',
          modifiers: [{ id: 99, modifier_id: 10, price_delta: '10.00' }],
        }),
      ],
      new Map([[1, latte]]),
      new Map([[10, 'Extra shot']]),
    )
    expect(result).toEqual([
      {
        product: latte,
        qty: 2,
        unit_price: 65,
        modifiers: [{ modifier_id: 10, name: 'Extra shot', price_delta: 10 }],
      },
    ])
  })

  it('falls back to a generic modifier name when not resolved', () => {
    const result = orderToTicketLines(
      [item({ id: 1, product_id: 1, modifiers: [{ id: 1, modifier_id: 7, price_delta: '5.00' }] })],
      new Map([[1, latte]]),
      new Map(),
    )
    expect(result[0]?.modifiers[0]?.name).toBe('ตัวเลือก')
  })

  it('drops items whose product is no longer in the catalogue', () => {
    const result = orderToTicketLines(
      [item({ id: 1, product_id: 1 }), item({ id: 2, product_id: 999 })],
      new Map([[1, latte]]),
      new Map(),
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.product.id).toBe(1)
  })
})
