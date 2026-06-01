import { m, useReducedMotion } from 'framer-motion'
import { Banknote, Receipt, TrendingUp, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'

import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { TiltCard } from '@/components/ui/TiltCard'
import { variants } from '@/lib/motion'
import type { SummaryResponse } from '@/types/dashboard'

interface KpiSpec {
  label: string
  /** Resolved numeric value, or null while the summary is still loading. */
  value: number | null
  /** Display formatter; defaults to baht currency in AnimatedNumber. */
  format?: (n: number) => string
  icon: ReactNode
  /** Accent (strip + icon) and the soft tint behind the icon tile. */
  accent: string
  soft: string
}

const intFmt = (n: number): string => Math.round(n).toLocaleString('th-TH')

export function KpiCards({ summary }: { summary: SummaryResponse | undefined }) {
  const reduced = useReducedMotion() ?? false
  const cards: KpiSpec[] = [
    {
      label: 'ยอดขายรวม',
      value: summary ? Number(summary.total_revenue) : null,
      icon: <Banknote className="h-5 w-5" />,
      accent: 'var(--color-chart-1)',
      soft: 'var(--color-chart-1-soft)',
    },
    {
      label: 'จำนวนบิล',
      value: summary ? summary.order_count : null,
      format: intFmt,
      icon: <Receipt className="h-5 w-5" />,
      accent: 'var(--color-chart-2)',
      soft: 'var(--color-chart-2-soft)',
    },
    {
      label: 'กำไรขั้นต้น',
      value: summary ? Number(summary.gross_profit) : null,
      icon: <TrendingUp className="h-5 w-5" />,
      accent: 'var(--color-chart-3)',
      soft: 'var(--color-chart-3-soft)',
    },
    {
      label: 'ยอดต่อบิลเฉลี่ย',
      value: summary ? Number(summary.average_ticket) : null,
      icon: <Wallet className="h-5 w-5" />,
      accent: 'var(--color-chart-4)',
      soft: 'var(--color-chart-4-soft)',
    },
  ]

  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={variants.stagger}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((card) => (
        <m.div key={card.label} variants={reduced ? variants.fadeIn : variants.riseIn}>
          <TiltCard
            className="h-full overflow-hidden rounded-[var(--radius-card)] border border-border
                       bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow duration-200
                       hover:shadow-[var(--shadow-card-hover)]"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1"
              style={{ background: card.accent }}
            />
            <div
              className="flex items-start justify-between gap-3"
              style={{ transform: 'translateZ(24px)' }}
            >
              <p className="text-sm font-medium text-text-muted">{card.label}</p>
              <span
                aria-hidden
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: card.soft, color: card.accent }}
              >
                {card.icon}
              </span>
            </div>
            <p
              className="mt-3 text-2xl font-bold tracking-tight text-text"
              style={{ transform: 'translateZ(12px)' }}
            >
              {card.value === null ? (
                <span className="text-text-muted">—</span>
              ) : (
                <AnimatedNumber value={card.value} format={card.format} />
              )}
            </p>
          </TiltCard>
        </m.div>
      ))}
    </m.div>
  )
}
