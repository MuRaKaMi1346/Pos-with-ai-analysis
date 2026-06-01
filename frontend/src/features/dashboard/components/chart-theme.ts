import type { CSSProperties } from 'react'

/** Shared Recharts theming so every dashboard chart reads from the same tokens. */

export const axisTick = { fontSize: 11, fill: 'var(--color-text-muted)' } as const
export const gridStroke = 'var(--color-border)'

/** Tooltip surface — matches the card surface + shadow tokens. */
export const tooltipContentStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-card)',
  color: 'var(--color-text)',
}

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 12,
  marginBottom: 2,
}
