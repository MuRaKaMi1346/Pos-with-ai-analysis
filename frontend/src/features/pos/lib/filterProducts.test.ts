import { describe, expect, it } from 'vitest'

import { categoryCounts, filterProducts } from '@/features/pos/lib/filterProducts'
import type { Product } from '@/types/product'

function makeProduct(over: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    category_id: null,
    price: '50.00',
    cost: '10.00',
    image: null,
    is_active: true,
    has_modifiers: false,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const products: Product[] = [
  makeProduct({ id: 1, name: 'Latte', category_id: 1 }),
  makeProduct({ id: 2, name: 'Espresso', category_id: 1 }),
  makeProduct({ id: 3, name: 'Green Tea', category_id: 2 }),
  makeProduct({ id: 4, name: 'Iced Lemon Tea', category_id: 2 }),
  makeProduct({ id: 5, name: 'Croissant', category_id: null }),
]

describe('filterProducts', () => {
  it('returns everything for the "All" entry with no query', () => {
    expect(filterProducts(products, { categoryId: null, query: '' })).toHaveLength(5)
  })

  it('restricts to a single category', () => {
    const result = filterProducts(products, { categoryId: 1, query: '' })
    expect(result.map((p) => p.name)).toEqual(['Latte', 'Espresso'])
  })

  it('matches the query case-insensitively on the name', () => {
    const result = filterProducts(products, { categoryId: null, query: 'TEA' })
    expect(result.map((p) => p.name)).toEqual(['Green Tea', 'Iced Lemon Tea'])
  })

  it('combines category + query', () => {
    const result = filterProducts(products, { categoryId: 2, query: 'lemon' })
    expect(result.map((p) => p.name)).toEqual(['Iced Lemon Tea'])
  })

  it('ignores surrounding whitespace in the query', () => {
    expect(filterProducts(products, { categoryId: null, query: '  latte  ' })).toHaveLength(1)
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterProducts(products, { categoryId: null, query: 'zzz' })).toEqual([])
  })
})

describe('categoryCounts', () => {
  it('counts products per category id, skipping uncategorised', () => {
    expect(categoryCounts(products)).toEqual({ 1: 2, 2: 2 })
  })

  it('returns an empty map for no products', () => {
    expect(categoryCounts([])).toEqual({})
  })
})
