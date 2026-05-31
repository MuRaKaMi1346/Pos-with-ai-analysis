import { createContext, useContext } from 'react'

/** Never show more than this many flying tokens at once (pos-ui-motion §4.5). */
export const MAX_TOKENS = 3

export interface FlyToken {
  id: string
  name: string
  from: { x: number; y: number; size: number }
  to: { x: number; y: number }
}

export interface TokenState {
  active: FlyToken[]
  queue: FlyToken[]
}

/** Admit a token, or defer it to the queue when MAX_TOKENS are already in flight. */
export function admitToken(state: TokenState, token: FlyToken): TokenState {
  if (state.active.length >= MAX_TOKENS) {
    return { active: state.active, queue: [...state.queue, token] }
  }
  return { active: [...state.active, token], queue: state.queue }
}

/** Drop a landed token and promote the next queued one (FIFO). */
export function releaseToken(state: TokenState, id: string): TokenState {
  const remaining = state.active.filter((t) => t.id !== id)
  const [next, ...rest] = state.queue
  if (next) return { active: [...remaining, next], queue: rest }
  return { active: remaining, queue: state.queue }
}

export interface FlyToCartValue {
  /** Launch a token from a source element toward the registered cart target. */
  fly: (source: HTMLElement | null, product: { name: string }) => void
  /** Callback ref for the cart badge — the flight destination. */
  registerTarget: (el: HTMLElement | null) => void
  /** Bumps each time a token lands, so the cart badge can pulse in step. */
  landed: number
}

const noop = (): void => {}

export const FlyToCartContext = createContext<FlyToCartValue>({
  fly: noop,
  registerTarget: noop,
  landed: 0,
})

/** Read the fly-to-cart controls. Safe (no-op) when used outside the provider. */
export function useFlyToCart(): FlyToCartValue {
  return useContext(FlyToCartContext)
}
