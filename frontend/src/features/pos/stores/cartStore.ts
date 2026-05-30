import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { OrderChannel } from '@/types/order'
import type { Product } from '@/types/product'

export interface CartLine {
  product: Product
  qty: number
}

interface CartState {
  lines: Record<number, CartLine>
  /** Sub-bar selection — sticky across sales (a station tends to keep one channel). */
  channel: OrderChannel
  /** Free-text table label; only meaningful for dine-in. */
  tableNumber: string
  add: (product: Product) => void
  inc: (productId: number) => void
  dec: (productId: number) => void
  remove: (productId: number) => void
  setChannel: (channel: OrderChannel) => void
  setTableNumber: (tableNumber: string) => void
  /** Reset the ticket after a sale: drop lines + table, keep the channel preference. */
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: {},
      channel: 'takeaway',
      tableNumber: '',
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
          return { lines: { ...state.lines, [productId]: { ...line, qty: line.qty + 1 } } }
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
          return { lines: { ...state.lines, [productId]: { ...line, qty: line.qty - 1 } } }
        })
      },
      remove: (productId) => {
        set((state) => {
          const next = { ...state.lines }
          delete next[productId]
          return { lines: next }
        })
      },
      setChannel: (channel) => {
        set({ channel })
      },
      setTableNumber: (tableNumber) => {
        set({ tableNumber })
      },
      clear: () => {
        set({ lines: {}, tableNumber: '' })
      },
    }),
    {
      name: 'smartbrew-ticket',
      // Persist the sale so a refresh mid-order doesn't lose the cart (spec §6).
      partialize: (state) => ({
        lines: state.lines,
        channel: state.channel,
        tableNumber: state.tableNumber,
      }),
    },
  ),
)

/** Pure helper — list lines in stable insertion order. */
export function cartLineList(lines: Record<number, CartLine>): CartLine[] {
  return Object.values(lines)
}

/** Pure helper — cart subtotal as a number (sums product.price × qty). */
export function cartTotal(lines: Record<number, CartLine>): number {
  return Object.values(lines).reduce((sum, line) => sum + Number(line.product.price) * line.qty, 0)
}
