interface Props {
  className?: string
}

/**
 * SmartBrew monoline brand mark — a clean single-weight espresso cup that draws
 * in `currentColor`, so it inherits the surface's text colour (white on the dark
 * login card). Pure decorative SVG (`aria-hidden`).
 */
export function LoginHeroFallback({ className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-testid="login-hero-fallback"
      className={className}
    >
      {/* steam */}
      <path d="M20 7c-2.2 2.2 2.2 4.4 0 6.6" opacity="0.65" />
      <path d="M28 7c-2.2 2.2 2.2 4.4 0 6.6" opacity="0.65" />
      {/* cup body */}
      <path d="M11 18h22l-2.2 12.4A6 6 0 0 1 24.9 35.4h-5.8A6 6 0 0 1 13.2 30.4z" />
      {/* handle */}
      <path d="M33 20.5a5.5 5.5 0 0 1 0 11" />
      {/* saucer */}
      <path d="M8.5 40h27" />
    </svg>
  )
}
