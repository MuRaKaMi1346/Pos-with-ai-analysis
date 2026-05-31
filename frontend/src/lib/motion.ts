import type { Transition, Variants } from 'framer-motion'

/** Cubic-bezier control points (framer-motion wants a strict 4-tuple). */
type Bezier = [number, number, number, number]

export const duration = {
  micro: 0.08,
  short: 0.18,
  base: 0.26,
  long: 0.42,
} as const

// Cubic-bezier curves — tuned for POS feel (pos-ui-motion §2.2).
export const ease = {
  out: [0.16, 1, 0.3, 1] as Bezier, // "expo out" — primary
  inOut: [0.65, 0, 0.35, 1] as Bezier,
  spring: [0.34, 1.56, 0.64, 1] as Bezier, // overshoots slightly
}

export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } satisfies Transition,
  soft: { type: 'spring', stiffness: 180, damping: 24, mass: 1 } satisfies Transition,
  bouncy: { type: 'spring', stiffness: 300, damping: 18, mass: 0.9 } satisfies Transition,
}

// Standard variants used across the codebase.
export const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: duration.short, ease: ease.out } },
  },
  riseIn: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  },
  popIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: spring.snappy },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
  },
} satisfies Record<string, Variants>
