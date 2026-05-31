interface Props {
  className?: string
}

/**
 * Line-art "load failed" illustration for the menu grid (pos-ui-motion §4.4): a
 * cup with a warning badge. Pure SVG, decorative (`aria-hidden`) — the
 * surrounding text carries the meaning. Colours come from the design tokens.
 */
export function MenuError({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      data-testid="menu-error-illustration"
      className={className}
    >
      <circle cx="60" cy="62" r="40" fill="var(--color-surface-2)" />
      {/* cup body */}
      <path
        d="M40 55 h32 l-3.6 30 a5 5 0 0 1-5 4.6 H48.6 a5 5 0 0 1-5-4.6 z"
        fill="var(--color-surface)"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* lid */}
      <path
        d="M37 55 h38 v-5 a3 3 0 0 0-3-3 H40 a3 3 0 0 0-3 3 z"
        fill="var(--color-surface)"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* warning badge */}
      <path
        d="M82 38 l15 25 a3.5 3.5 0 0 1-3 5.2 H70 a3.5 3.5 0 0 1-3-5.2 z"
        fill="var(--color-danger)"
      />
      <rect x="87.4" y="48" width="3.2" height="11" rx="1.6" fill="var(--color-primary-fg)" />
      <circle cx="89" cy="64" r="2" fill="var(--color-primary-fg)" />
    </svg>
  )
}
