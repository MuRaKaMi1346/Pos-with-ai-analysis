import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { duration, ease, spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  isLoading: boolean
  isEmpty: boolean
  emptyLabel?: string
  /** Reserved content height — keeps loading / empty / chart states the same size. */
  height?: number
  /** Position in its row; used to stagger the entrance a touch. */
  index?: number
  className?: string
  children: ReactNode
}

/**
 * Card shell for a dashboard chart: token-driven surface, an entrance rise, and
 * a subtle hover lift for depth (pos-ui-motion §3.2 feel, simplified). Owns the
 * shared loading skeleton + empty state so each chart only provides its plot.
 * Reduced motion → opacity-only entrance, no hover lift.
 */
export function ChartCard({
  title,
  isLoading,
  isEmpty,
  emptyLabel = 'ยังไม่มีข้อมูลในช่วงนี้',
  height = 280,
  index = 0,
  className,
  children,
}: Props) {
  const reduced = useReducedMotion() ?? false
  const enter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <m.div
      {...enter}
      transition={{ duration: duration.base, ease: ease.out, delay: index * 0.06 }}
      whileHover={reduced ? undefined : { y: -4, transition: spring.soft }}
      className="h-full"
    >
      <Card
        className={cn(
          'flex h-full flex-col border-border bg-surface text-text shadow-[var(--shadow-card)]',
          'transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]',
          className,
        )}
      >
        <CardHeader>
          <CardTitle className="text-base font-semibold text-text">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center" style={{ height }}>
              <div className="h-full w-full animate-pulse rounded-[var(--radius-card)] bg-surface-2 motion-reduce:animate-none" />
            </div>
          ) : isEmpty ? (
            <div
              className="flex items-center justify-center text-sm text-text-muted"
              style={{ height }}
            >
              {emptyLabel}
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </m.div>
  )
}
