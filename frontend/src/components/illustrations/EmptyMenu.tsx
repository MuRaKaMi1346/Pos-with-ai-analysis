interface Props {
  className?: string
}

/**
 * Line-art "empty / no results" illustration for the menu grid (pos-ui-motion
 * §4.4). Pure SVG, decorative (`aria-hidden`) — the surrounding text carries the
 * meaning. Colours come from the design tokens so it tracks the theme.
 */
export function EmptyMenu({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      data-testid="empty-menu-illustration"
      className={className}
    >
      <circle cx="60" cy="62" r="40" fill="var(--color-surface-2)" />
      {/* dashed steam — the "nothing here" cue */}
      <path
        d="M54 33 q5 -7 0 -14 M66 33 q5 -7 0 -14"
        stroke="var(--color-border)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 7"
      />
      {/* cup body */}
      <path
        d="M44 51 h32 l-3.6 34 a5 5 0 0 1-5 4.6 H52.6 a5 5 0 0 1-5-4.6 z"
        fill="var(--color-surface)"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* lid */}
      <path
        d="M41 51 h38 v-5 a3 3 0 0 0-3-3 H44 a3 3 0 0 0-3 3 z"
        fill="var(--color-surface)"
        stroke="var(--color-text-muted)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="55" y="45" width="10" height="3.5" rx="1.75" fill="var(--color-text-muted)" />
    </svg>
  )
}
