import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { ProductFallback } from '@/components/ui/ProductFallback'
import {
  admitToken,
  FlyToCartContext,
  releaseToken,
  type FlyToCartValue,
  type FlyToken,
  type TokenState,
} from '@/features/pos/hooks/useFlyToCart'
import { spring } from '@/lib/motion'

const MAX_TOKEN_SIZE = 88

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Hosts the flying-token overlay and the cart destination. A tap on a product
 * launches a `<ProductFallback>` mini from the card to the cart badge with
 * `spring.snappy`, shrinking and fading out near the end. No-op under reduced
 * motion — the badge count just updates.
 */
export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false
  const targetRef = useRef<HTMLElement | null>(null)
  const [tokens, setTokens] = useState<TokenState>({ active: [], queue: [] })
  const [landed, setLanded] = useState(0)

  const registerTarget = useCallback((el: HTMLElement | null) => {
    targetRef.current = el
  }, [])

  const fly = useCallback<FlyToCartValue['fly']>(
    (source, product) => {
      if (reduced || !source || !targetRef.current) return
      const s = source.getBoundingClientRect()
      const t = targetRef.current.getBoundingClientRect()
      const size = Math.min(s.width, s.height, MAX_TOKEN_SIZE)
      const token: FlyToken = {
        id: newId(),
        name: product.name,
        from: { x: s.left + s.width / 2 - size / 2, y: s.top + s.height / 2 - size / 2, size },
        to: { x: t.left + t.width / 2 - size / 2, y: t.top + t.height / 2 - size / 2 },
      }
      setTokens((cur) => admitToken(cur, token))
    },
    [reduced],
  )

  const handleComplete = useCallback((id: string) => {
    setLanded((n) => n + 1)
    setTokens((cur) => releaseToken(cur, id))
  }, [])

  return (
    <FlyToCartContext.Provider value={{ fly, registerTarget, landed }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-0 z-[100]">
          <AnimatePresence>
            {tokens.active.map((token) => (
              <m.div
                key={token.id}
                data-testid="fly-token"
                initial={{ x: token.from.x, y: token.from.y, scale: 1, opacity: 1 }}
                animate={{ x: token.to.x, y: token.to.y, scale: 0.4, opacity: [1, 1, 0] }}
                transition={{
                  ...spring.snappy,
                  opacity: { duration: 0.45, times: [0, 0.7, 1], ease: 'easeIn' },
                }}
                onAnimationComplete={() => {
                  handleComplete(token.id)
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: token.from.size,
                  height: token.from.size,
                }}
                className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card-hover)]"
              >
                <ProductFallback name={token.name} className="h-full w-full" />
              </m.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </FlyToCartContext.Provider>
  )
}
