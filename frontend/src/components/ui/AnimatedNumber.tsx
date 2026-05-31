import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

import { spring as springs } from '@/lib/motion'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
  /** The target number; the displayed value tweens toward it. */
  value: number
  /** Defaults to baht currency formatting. */
  format?: (n: number) => string
  className?: string
}

/**
 * Counts a number up/down to `value` with a spring, formatted via `format`
 * (default `formatCurrency`). The tween drives a MotionValue so React doesn't
 * re-render each frame; `tabular-nums` keeps the width steady (pos-ui-motion
 * §4.10). Under reduced motion it renders the value directly.
 */
export function AnimatedNumber({ value, format = formatCurrency, className }: Props) {
  const reduced = useReducedMotion() ?? false
  const mv = useMotionValue(value)
  const tweened = useSpring(mv, springs.soft)
  const text = useTransform(tweened, (n) => format(n))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  if (reduced) {
    return <span className={cn('tabular-nums', className)}>{format(value)}</span>
  }
  return <m.span className={cn('tabular-nums', className)}>{text}</m.span>
}
