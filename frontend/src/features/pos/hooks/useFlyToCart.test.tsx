import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FlyToCartProvider } from '@/features/pos/hooks/FlyToCartProvider'
import {
  admitToken,
  releaseToken,
  useFlyToCart,
  type FlyToken,
  type TokenState,
} from '@/features/pos/hooks/useFlyToCart'

function token(id: string): FlyToken {
  return { id, name: id, from: { x: 0, y: 0, size: 10 }, to: { x: 0, y: 0 } }
}

const empty: TokenState = { active: [], queue: [] }

describe('fly-to-cart token queue', () => {
  it('admits up to MAX_TOKENS, then queues the rest', () => {
    let s = empty
    for (const id of ['a', 'b', 'c', 'd']) s = admitToken(s, token(id))
    expect(s.active.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(s.queue.map((t) => t.id)).toEqual(['d'])
  })

  it('promotes the next queued token (FIFO) when one lands', () => {
    let s = empty
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = admitToken(s, token(id))
    s = releaseToken(s, 'a')
    expect(s.active.map((t) => t.id)).toEqual(['b', 'c', 'd'])
    expect(s.queue.map((t) => t.id)).toEqual(['e'])
  })

  it('just removes a landed token when nothing is queued', () => {
    let s = admitToken(empty, token('a'))
    s = releaseToken(s, 'a')
    expect(s.active).toHaveLength(0)
    expect(s.queue).toHaveLength(0)
  })
})

describe('useFlyToCart', () => {
  it('is a no-op outside the provider (does not throw)', () => {
    function Probe() {
      const { fly, landed } = useFlyToCart()
      fly(null, { name: 'Latte' })
      return <span>landed:{landed}</span>
    }
    render(<Probe />)
    expect(screen.getByText('landed:0')).toBeInTheDocument()
  })

  it('renders its children inside the provider', () => {
    render(
      <FlyToCartProvider>
        <p>menu</p>
      </FlyToCartProvider>,
    )
    expect(screen.getByText('menu')).toBeInTheDocument()
  })
})
