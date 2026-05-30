import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Customer } from '@/types/customer'
import type { OrderChannel } from '@/types/order'
import type { Product } from '@/types/product'

/** A modifier the cashier picked for a line — snapshot for display + order create. */
export interface SelectedModifier {
  modifier_id: number
  name: string
  price_delta: number
}

/**
 * One ticket line. The same product with different modifiers/notes lives on
 * separate lines, so the key is a local `uid` — not the product id (spec §6).
 */
export interface TicketLine {
  uid: string
  product: Product
  qty: number
  /** Snapshot of the product price at add time. */
  unit_price: number
  modifiers: SelectedModifier[]
  note?: string
}

interface TicketState {
  lines: TicketLine[]
  /** Sub-bar selection — sticky across sales. */
  channel: OrderChannel
  tableNumber: string
  /** Attached customer for loyalty + history (M15); null = walk-in. */
  customer: Customer | null
  addLine: (product: Product, modifiers?: SelectedModifier[], note?: string) => void
  incLine: (uid: string) => void
  decLine: (uid: string) => void
  setQty: (uid: string, qty: number) => void
  updateLine: (uid: string, patch: { modifiers: SelectedModifier[]; note?: string }) => void
  removeLine: (uid: string) => void
  setChannel: (channel: OrderChannel) => void
  setTableNumber: (tableNumber: string) => void
  setCustomer: (customer: Customer | null) => void
  /** Reset the ticket after a sale: drop lines + table + customer, keep channel. */
  clear: () => void
  /** Replace the whole ticket from a resumed held order (fresh line uids). */
  loadOrder: (payload: {
    lines: Omit<TicketLine, 'uid'>[]
    channel: OrderChannel
    tableNumber: string
  }) => void
}

function newUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function normNote(note?: string): string | undefined {
  const trimmed = note?.trim()
  return trimmed ? trimmed : undefined
}

/** Merge key: identical product + modifier set + note collapse onto one line. */
function lineKey(productId: number, modifiers: SelectedModifier[], note?: string): string {
  const mods = modifiers
    .map((m) => m.modifier_id)
    .sort((a, b) => a - b)
    .join(',')
  return `${productId}|${mods}|${note ?? ''}`
}

export const useCartStore = create<TicketState>()(
  persist(
    (set) => ({
      lines: [],
      channel: 'takeaway',
      tableNumber: '',
      customer: null,
      addLine: (product, modifiers = [], note) => {
        set((state) => {
          const cleanNote = normNote(note)
          const key = lineKey(product.id, modifiers, cleanNote)
          const existing = state.lines.find(
            (l) => lineKey(l.product.id, l.modifiers, l.note) === key,
          )
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.uid === existing.uid ? { ...l, qty: l.qty + 1 } : l,
              ),
            }
          }
          const line: TicketLine = {
            uid: newUid(),
            product,
            qty: 1,
            unit_price: Number(product.price),
            modifiers,
            note: cleanNote,
          }
          return { lines: [...state.lines, line] }
        })
      },
      incLine: (uid) => {
        set((state) => ({
          lines: state.lines.map((l) => (l.uid === uid ? { ...l, qty: l.qty + 1 } : l)),
        }))
      },
      decLine: (uid) => {
        set((state) => {
          const line = state.lines.find((l) => l.uid === uid)
          if (!line) return state
          if (line.qty <= 1) return { lines: state.lines.filter((l) => l.uid !== uid) }
          return { lines: state.lines.map((l) => (l.uid === uid ? { ...l, qty: l.qty - 1 } : l)) }
        })
      },
      setQty: (uid, qty) => {
        set((state) => {
          if (qty <= 0) return { lines: state.lines.filter((l) => l.uid !== uid) }
          return { lines: state.lines.map((l) => (l.uid === uid ? { ...l, qty } : l)) }
        })
      },
      updateLine: (uid, patch) => {
        set((state) => {
          const cleanNote = normNote(patch.note)
          return {
            lines: state.lines.map((l) =>
              l.uid === uid ? { ...l, modifiers: patch.modifiers, note: cleanNote } : l,
            ),
          }
        })
      },
      removeLine: (uid) => {
        set((state) => ({ lines: state.lines.filter((l) => l.uid !== uid) }))
      },
      setChannel: (channel) => {
        set({ channel })
      },
      setTableNumber: (tableNumber) => {
        set({ tableNumber })
      },
      setCustomer: (customer) => {
        set({ customer })
      },
      clear: () => {
        set({ lines: [], tableNumber: '', customer: null })
      },
      loadOrder: (payload) => {
        set({
          lines: payload.lines.map((l) => ({ ...l, uid: newUid() })),
          channel: payload.channel,
          tableNumber: payload.tableNumber,
          customer: null,
        })
      },
    }),
    {
      name: 'smartbrew-ticket',
      // v1: M12 stored `lines` as a product-id map; M13 makes it a uid array.
      version: 1,
      partialize: (state) => ({
        lines: state.lines,
        channel: state.channel,
        tableNumber: state.tableNumber,
        customer: state.customer,
      }),
      migrate: (persisted, version) => {
        const prev = (persisted ?? {}) as Partial<TicketState>
        if (version < 1 || !Array.isArray(prev.lines)) {
          return { ...prev, lines: [] } as TicketState
        }
        return prev as TicketState
      },
    },
  ),
)

/** Unit price including selected modifier deltas. */
export function lineUnitPrice(line: TicketLine): number {
  return line.unit_price + line.modifiers.reduce((sum, m) => sum + m.price_delta, 0)
}

/** Line subtotal = unit price (with modifiers) × qty. */
export function lineSubtotal(line: TicketLine): number {
  return lineUnitPrice(line) * line.qty
}

/** Ticket subtotal across all lines (pre tax / service / discount). */
export function ticketSubtotal(lines: TicketLine[]): number {
  return lines.reduce((sum, l) => sum + lineSubtotal(l), 0)
}

/** Total item count (sum of quantities) — drives the cart header badge. */
export function ticketCount(lines: TicketLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0)
}
