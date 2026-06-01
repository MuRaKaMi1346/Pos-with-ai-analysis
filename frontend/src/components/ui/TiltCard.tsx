import {
  m,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useRef, type PointerEvent, type ReactNode } from 'react'

import { duration, ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

const ROTATE_X_RANGE = 5
const ROTATE_Y_RANGE = 7
const LIFT_Z = 12

interface Props {
  children: ReactNode
  /** Surface styling for the tilting element (bg / border / radius / padding). */
  className?: string
  /** Show the pointer-tracking gloss highlight (default true). */
  glare?: boolean
}

/**
 * Reusable pseudo-3D tilt container (pos-ui-motion §3.1, extracted from
 * ProductCard). The element owns a `perspective` parent, rotates a few degrees
 * on X/Y from the pointer position, lifts on hover via `translateZ`, and shows a
 * soft gloss that parallaxes against the pointer. Children placed on their own
 * `translateZ` layer pop forward for real depth. Under reduced motion it stays
 * flat — only the caller's hover shadow remains.
 */
export function TiltCard({ children, className, glare = true }: Props) {
  const reduced = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)

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
  const glossBg = useMotionTemplate`radial-gradient(circle at ${glossX} ${glossY}, rgba(255,255,255,0.22), transparent 55%)`

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function handlePointerLeave(): void {
    px.set(0)
    py.set(0)
  }

  return (
    <div style={{ perspective: 1200 }} className="contents">
      <m.div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        whileHover={reduced ? undefined : { translateZ: LIFT_Z }}
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' as const }}
        transition={{ duration: duration.short, ease: ease.out }}
        className={cn('relative', className)}
      >
        {children}
        {!reduced && glare && (
          <m.div
            data-testid="tilt-glare"
            aria-hidden
            style={{ background: glossBg }}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
          />
        )}
      </m.div>
    </div>
  )
}
