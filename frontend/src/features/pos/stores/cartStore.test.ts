import { beforeEach, describe, expect, it } from 'vitest'

import { cartLineList, cartTotal, useCartStore } from '@/features/pos/stores/cartStore'
import type { Product } from '@/types/product'

const latte: Product = {
  id: 1,
  name: 'Latte',
  category_id: null,
  price: '65.00',
  cost: '18.00',
  image: null,
  is_active: true,
  created_at: '',
  updated_at: '',
}

const espresso: Product = {
  ...latte,
  id: 2,
  name: 'Espresso',
  price: '55.00',
}

beforeEach(() => {
  useCartStore.getState().clear()
})

describe('cartStore', () => {
  it('adds a new line with qty=1', () => {
    useCartStore.getState().add(latte)
    const lines = cartLineList(useCartStore.getState().lines)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(1)
  })

  it('add() on an existing product increments qty', () => {
    useCartStore.getState().add(latte)
    useCartStore.getState().add(latte)
    expect(useCartStore.getState().lines[1]?.qty).toBe(2)
  })

  it('inc / dec adjust qty', () => {
    useCartStore.getState().add(latte)
    useCartStore.getState().inc(1)
    useCartStore.getState().inc(1)
    expect(useCartStore.getState().lines[1]?.qty).toBe(3)
    useCartStore.getState().dec(1)
    expect(useCartStore.getState().lines[1]?.qty).toBe(2)
  })

  it('dec on qty=1 removes the line', () => {
    useCartStore.getState().add(latte)
    useCartStore.getState().dec(1)
    expect(useCartStore.getState().lines[1]).toBeUndefined()
  })

  it('remove() drops a line outright', () => {
    useCartStore.getState().add(latte)
    useCartStore.getState().add(espresso)
    useCartStore.getState().remove(1)
    expect(Object.keys(useCartStore.getState().lines)).toEqual(['2'])
  })

  it('clear() empties the cart', () => {
    useCartStore.getState().add(latte)
    useCartStore.getState().add(espresso)
    useCartStore.getState().clear()
    expect(useCartStore.getState().lines).toEqual({})
  })

  it('cartTotal sums price × qty across lines', () => {
    useCartStore.getState().add(latte) // 65
    useCartStore.getState().add(latte) // +65 -> 130
    useCartStore.getState().add(espresso) // +55 -> 185
    expect(cartTotal(useCartStore.getState().lines)).toBe(185)
  })
})
