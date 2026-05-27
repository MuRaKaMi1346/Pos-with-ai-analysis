import { create } from 'zustand'

import type { Product } from '@/types/product'

export interface CartLine {
  product: Product
  qty: number
}

interface CartState {
  lines: Record<number, CartLine>
  add: (product: Product) => void
  inc: (productId: number) => void
  dec: (productId: number) => void
  remove: (productId: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  lines: {},
  add: (product) => {
    set((state) => {
      const existing = state.lines[product.id]
      const line: CartLine = existing ? { product, qty: existing.qty + 1 } : { product, qty: 1 }
      return { lines: { ...state.lines, [product.id]: line } }
    })
  },
  inc: (productId) => {
    set((state) => {
      const line = state.lines[productId]
      if (!line) return state
      return {
        lines: {
          ...state.lines,
          [productId]: { ...line, qty: line.qty + 1 },
        },
      }
    })
  },
  dec: (productId) => {
    set((state) => {
      const line = state.lines[productId]
      if (!line) return state
      if (line.qty <= 1) {
        const next = { ...state.lines }
        delete next[productId]
        return { lines: next }
      }
      return {
        lines: {
          ...state.lines,
          [productId]: { ...line, qty: line.qty - 1 },
        },
      }
    })
  },
  remove: (productId) => {
    set((state) => {
      const next = { ...state.lines }
      delete next[productId]
      return { lines: next }
    })
  },
  clear: () => {
    set({ lines: {} })
  },
}))

/** Pure helper — list lines in stable insertion order. */
export function cartLineList(lines: Record<number, CartLine>): CartLine[] {
  return Object.values(lines)
}

/** Pure helper — cart total as a number (sums product.price × qty). */
export function cartTotal(lines: Record<number, CartLine>): number {
  return Object.values(lines).reduce((sum, line) => sum + Number(line.product.price) * line.qty, 0)
}
