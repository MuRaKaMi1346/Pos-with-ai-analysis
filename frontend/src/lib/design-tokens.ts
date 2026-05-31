/**
 * TS mirror of the CSS design tokens (pos-ui-motion §2). The single place to
 * read design values from JS (e.g. framer-motion `style`/`animate` props or SVG
 * fills). CSS uses the same values via `var(--…)` from index.css `@theme`.
 */

export const radius = {
  card: 14,
} as const

export const shadow = {
  card: '0 1px 2px oklch(0 0 0 / 0.04), 0 6px 18px oklch(0 0 0 / 0.06)',
  cardHover: '0 2px 6px oklch(0 0 0 / 0.08), 0 18px 40px oklch(0 0 0 / 0.12)',
  press: '0 1px 1px oklch(0 0 0 / 0.1) inset',
} as const

/** Colour token references for inline styles / SVG (resolve via CSS `var`). */
export const colorVar = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface-2)',
  surfaceInk: 'var(--color-surface-ink)',
  border: 'var(--color-border)',
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  primary: 'var(--color-primary)',
  primaryFg: 'var(--color-primary-fg)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
} as const
