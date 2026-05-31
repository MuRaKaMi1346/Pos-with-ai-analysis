import { AnimatePresence, m, useReducedMotion, type Variants } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { EmptyMenu } from '@/components/illustrations/EmptyMenu'
import { MenuError } from '@/components/illustrations/MenuError'
import { ProductCard } from '@/features/pos/components/ProductCard'
import { duration, ease } from '@/lib/motion'
import type { Product } from '@/types/product'

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
/** Cap the entrance stagger so a big category stays snappy (pos-ui-motion §4.4). */
const STAGGER_CAP = 16

interface MenuPanelProps {
  products: Product[]
  query: string
  onQueryChange: (query: string) => void
  onAdd: (product: Product) => void
  isPending: boolean
  isError: boolean
}

// Per-item entrance: rise + fade, delayed by its (capped) index. Driven by the
// item's own initial/animate so it works without a stagger container.
const gridItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: ease.out, delay: Math.min(i, STAGGER_CAP) * 0.04 },
  }),
}

/** Middle column: search (autofocus + `/` shortcut) over a responsive grid. */
export function MenuPanel({
  products,
  query,
  onQueryChange,
  onAdd,
  isPending,
  isError,
}: MenuPanelProps) {
  const reduced = useReducedMotion() ?? false
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent): void {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      <div className="shrink-0 border-b border-border p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onQueryChange('')
            }}
            placeholder="ค้นหาเมนู…  ( / )"
            aria-label="ค้นหาเมนู"
            className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus-visible:shadow-[0_0_0_3px_var(--color-primary)] focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isPending ? (
          <MenuSkeleton reduced={reduced} />
        ) : isError ? (
          <StateBlock
            reduced={reduced}
            illustration={<MenuError className="h-28 w-28" />}
            text="โหลดเมนูไม่สำเร็จ"
            tone="danger"
          />
        ) : products.length === 0 ? (
          <StateBlock
            reduced={reduced}
            illustration={<EmptyMenu className="h-28 w-28" />}
            text={query ? `ไม่พบเมนูที่ตรงกับ "${query}"` : 'ยังไม่มีเมนูในหมวดนี้'}
          />
        ) : (
          <div className={GRID}>
            <AnimatePresence>
              {products.map((product, i) => (
                <m.div
                  key={product.id}
                  custom={i}
                  variants={reduced ? undefined : gridItem}
                  initial={reduced ? false : 'hidden'}
                  animate={reduced ? false : 'visible'}
                  exit={
                    reduced
                      ? undefined
                      : {
                          opacity: 0,
                          y: -8,
                          transition: { duration: duration.short, ease: ease.out },
                        }
                  }
                >
                  <ProductCard product={product} onAdd={onAdd} />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}

/** Centred illustration + message for the empty / error states. */
function StateBlock({
  illustration,
  text,
  tone = 'muted',
  reduced,
}: {
  illustration: ReactNode
  text: string
  tone?: 'muted' | 'danger'
  reduced: boolean
}) {
  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? false : { opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out }}
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
    >
      {illustration}
      <p className={`text-sm ${tone === 'danger' ? 'text-danger' : 'text-text-muted'}`}>{text}</p>
    </m.div>
  )
}

/** 8 shimmer tiles; the opacity loop is dropped under reduced motion. */
function MenuSkeleton({ reduced }: { reduced: boolean }) {
  return (
    <div className={GRID}>
      {Array.from({ length: 8 }).map((_, i) => (
        <m.div
          key={i}
          className="aspect-[3/4] rounded-[var(--radius-card)] bg-surface-2"
          animate={reduced ? undefined : { opacity: [0.6, 1, 0.6] }}
          transition={
            reduced
              ? undefined
              : { duration: 1, ease: ease.inOut, repeat: Infinity, delay: i * 0.06 }
          }
        />
      ))}
    </div>
  )
}
