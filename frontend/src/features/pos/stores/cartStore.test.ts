import { beforeEach, describe, expect, it } from 'vitest'

import {
  lineSubtotal,
  ticketCount,
  ticketSubtotal,
  useCartStore,
  type SelectedModifier,
} from '@/features/pos/stores/cartStore'
import type { Customer } from '@/types/customer'
import type { Product } from '@/types/product'

const latte: Product = {
  id: 1,
  name: 'Latte',
  category_id: null,
  price: '65.00',
  cost: '18.00',
  image: null,
  is_active: true,
  sku: null,
  barcode: null,
  has_modifiers: false,
  created_at: '',
  updated_at: '',
}
const espresso: Product = { ...latte, id: 2, name: 'Espresso', price: '55.00' }

const shot: SelectedModifier = { modifier_id: 10, name: 'Extra shot', price_delta: 10 }
const oat: SelectedModifier = { modifier_id: 11, name: 'Oat milk', price_delta: 15 }

/** First line's uid (tests add exactly one line before calling this). */
function firstUid(): string {
  const uid = useCartStore.getState().lines[0]?.uid
  if (uid === undefined) throw new Error('expected at least one line')
  return uid
}

beforeEach(() => {
  useCartStore.setState({ lines: [], channel: 'takeaway', tableNumber: '', customer: null })
})

describe('cartStore (ticket)', () => {
  it('addLine creates a uid line with qty 1 and a price snapshot', () => {
    useCartStore.getState().addLine(latte)
    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(1)
    expect(typeof lines[0]?.uid).toBe('string')
    expect(lines[0]?.unit_price).toBe(65)
  })

  it('addLine merges an identical product + modifiers + note', () => {
    useCartStore.getState().addLine(latte, [shot], 'hot')
    useCartStore.getState().addLine(latte, [shot], 'hot')
    const lines = useCartStore.getState().lines
    expect(lines).toHaveLength(1)
    expect(lines[0]?.qty).toBe(2)
  })

  it('addLine keeps different modifier sets on separate lines', () => {
    useCartStore.getState().addLine(latte, [shot])
    useCartStore.getState().addLine(latte, [oat])
    expect(useCartStore.getState().lines).toHaveLength(2)
  })

  it('addLine keeps a different note on a separate line', () => {
    useCartStore.getState().addLine(latte, [], 'no ice')
    useCartStore.getState().addLine(latte, [])
    expect(useCartStore.getState().lines).toHaveLength(2)
  })

  it('incLine / decLine adjust qty; dec at qty 1 removes the line', () => {
    useCartStore.getState().addLine(latte)
    const uid = firstUid()
    useCartStore.getState().incLine(uid)
    expect(useCartStore.getState().lines[0]?.qty).toBe(2)
    useCartStore.getState().decLine(uid)
    useCartStore.getState().decLine(uid)
    expect(useCartStore.getState().lines).toHaveLength(0)
  })

  it('setQty replaces qty and removes the line at <= 0', () => {
    useCartStore.getState().addLine(latte)
    const uid = firstUid()
    useCartStore.getState().setQty(uid, 5)
    expect(useCartStore.getState().lines[0]?.qty).toBe(5)
    useCartStore.getState().setQty(uid, 0)
    expect(useCartStore.getState().lines).toHaveLength(0)
  })

  it('updateLine replaces the modifier set + note', () => {
    useCartStore.getState().addLine(latte)
    useCartStore.getState().updateLine(firstUid(), { modifiers: [shot], note: 'extra hot' })
    const line = useCartStore.getState().lines[0]
    expect(line?.modifiers).toEqual([shot])
    expect(line?.note).toBe('extra hot')
  })

  it('removeLine drops a line by uid', () => {
    useCartStore.getState().addLine(latte)
    useCartStore.getState().addLine(espresso)
    useCartStore.getState().removeLine(firstUid())
    expect(useCartStore.getState().lines.map((l) => l.product.id)).toEqual([2])
  })

  it('lineSubtotal / ticketSubtotal / ticketCount include modifier deltas', () => {
    useCartStore.getState().addLine(latte, [shot]) // (65 + 10)
    useCartStore.getState().incLine(firstUid()) // ×2 -> 150
    useCartStore.getState().addLine(espresso) // 55
    const lines = useCartStore.getState().lines
    const lineOne = lines[0]
    expect(lineOne && lineSubtotal(lineOne)).toBe(150)
    expect(ticketSubtotal(lines)).toBe(205)
    expect(ticketCount(lines)).toBe(3)
  })

  it('setChannel / setTableNumber update the sub-bar; clear keeps the channel', () => {
    useCartStore.getState().setChannel('dine_in')
    useCartStore.getState().setTableNumber('A3')
    useCartStore.getState().addLine(latte)
    useCartStore.getState().clear()
    const s = useCartStore.getState()
    expect(s.lines).toEqual([])
    expect(s.tableNumber).toBe('')
    expect(s.channel).toBe('dine_in')
  })

  it('loadOrder replaces the ticket with fresh-uid lines + channel/table', () => {
    useCartStore.getState().addLine(espresso) // to be replaced
    useCartStore.getState().loadOrder({
      lines: [{ product: latte, qty: 2, unit_price: 65, modifiers: [shot] }],
      channel: 'dine_in',
      tableNumber: 'B2',
    })
    const s = useCartStore.getState()
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0]?.product.id).toBe(1)
    expect(s.lines[0]?.qty).toBe(2)
    expect(typeof s.lines[0]?.uid).toBe('string')
    expect(s.channel).toBe('dine_in')
    expect(s.tableNumber).toBe('B2')
  })

  it('setCustomer attaches a customer; clear resets it to walk-in', () => {
    const ann: Customer = {
      id: 5,
      code: 'C5',
      name: 'Ann',
      phone: null,
      loyalty_points: 10,
      pending_redemption_baht: '0.00',
    }
    useCartStore.getState().setCustomer(ann)
    expect(useCartStore.getState().customer).toEqual(ann)
    useCartStore.getState().clear()
    expect(useCartStore.getState().customer).toBeNull()
  })
})
