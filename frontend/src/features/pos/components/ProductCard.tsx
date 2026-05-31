import {
  m,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import { Plus } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'

import { ProductFallback } from '@/components/ui/ProductFallback'
import { duration, ease, spring } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'

const ROTATE_X_RANGE = 6
const ROTATE_Y_RANGE = 10
const LIFT_Z = 14

interface Props {
  product: Product
  onAdd: (product: Product) => void
  disabled?: boolean
}

/** Flagship product tile with pseudo-3D tilt on hover/press (pos-ui-motion §4.3). */
export function ProductCard({ product, onAdd, disabled = false }: Props) {
  const reduced = useReducedMotion() ?? false
  const ref = useRef<HTMLButtonElement>(null)

  // Raw pointer-derived values (-0.5 .. 0.5 within the card), smoothed via spring.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [ROTATE_X_RANGE, -ROTATE_X_RANGE]), {
    stiffness: 220,
    damping: 22,
  })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-ROTATE_Y_RANGE, ROTATE_Y_RANGE]), {
    stiffness: 220,
    damping: 22,
  })
  const glossX = useTransform(px, [-0.5, 0.5], ['30%', '70%'])
  const glossY = useTransform(py, [-0.5, 0.5], ['30%', '70%'])
  const glossBg = useMotionTemplate`radial-gradient(circle at ${glossX} ${glossY}, rgba(255,255,255,0.18), transparent 60%)`

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>): void {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function handlePointerLeave(): void {
    px.set(0)
    py.set(0)
  }

  // Variant labels propagate from the card to the ADD chip on hover/focus.
  const cardVariants: Variants = { rest: {}, active: reduced ? {} : { translateZ: LIFT_Z } }
  const chipVariants: Variants = reduced
    ? { rest: { opacity: 0 }, active: { opacity: 1 } }
    : { rest: { scale: 0, opacity: 0 }, active: { scale: 1, opacity: 1 } }

  return (
    <div style={{ perspective: 1200 }} className="contents">
      <m.button
        ref={ref}
        type="button"
        aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
        disabled={disabled}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={() => {
          onAdd(product)
        }}
        initial="rest"
        animate="rest"
        whileHover="active"
        whileFocus="active"
        whileTap={{ scale: 0.97 }}
        variants={cardVariants}
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' as const }}
        transition={{ duration: duration.short, ease: ease.out }}
        className="group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-card)]
                   bg-surface text-left shadow-[var(--shadow-card)] outline-none
                   transition-shadow hover:shadow-[var(--shadow-card-hover)]
                   focus-visible:shadow-[0_0_0_3px_var(--color-primary)]
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="relative aspect-square w-full">
          {product.image ? (
            <img src={product.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ProductFallback name={product.name} className="h-full w-full" />
          )}
          {!reduced && (
            <m.div
              data-testid="card-gloss"
              aria-hidden
              style={{ background: glossBg }}
              className="pointer-events-none absolute inset-0"
            />
          )}
          {product.has_modifiers && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              ตัวเลือก
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-text">
            {product.name}
          </span>
          <span className="mt-auto text-base font-semibold tabular-nums text-text">
            {formatCurrency(product.price)}
          </span>
        </div>
        <m.span
          aria-hidden
          variants={chipVariants}
          transition={reduced ? { duration: duration.micro } : spring.bouncy}
          className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center
                     rounded-full bg-primary text-primary-fg shadow-md"
        >
          <Plus className="h-4 w-4" />
        </m.span>
      </m.button>
    </div>
  )
}
