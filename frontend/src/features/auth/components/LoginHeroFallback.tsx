interface Props {
  className?: string
}

/**
 * Static low-poly coffee cup — the reduced-motion stand-in for the 3D hero and
 * the Suspense placeholder while the R3F chunk loads (pos-ui-motion §4.7).
 * Pure SVG, decorative (`aria-hidden`).
 */
export function LoginHeroFallback({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden
      data-testid="login-hero-fallback"
      className={className}
    >
      <defs>
        <linearGradient id="hero-cup-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6646" />
          <stop offset="1" stopColor="#4b3621" />
        </linearGradient>
      </defs>
      {/* handle */}
      <path
        d="M84 52 q24 8 0 30"
        stroke="#3a2a1c"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      {/* body */}
      <path d="M34 46 h52 l-6 44 a6 6 0 0 1-6 5 H46 a6 6 0 0 1-6-5 z" fill="url(#hero-cup-body)" />
      {/* low-poly facet highlight */}
      <path d="M34 46 h22 l-4 49 H46 a6 6 0 0 1-6-5 z" fill="#ffffff" opacity="0.08" />
      {/* rim */}
      <ellipse cx="60" cy="46" rx="26" ry="7.5" fill="#3a2a1c" />
      <ellipse cx="60" cy="43.5" rx="26" ry="7.5" fill="#6f4f35" />
      {/* steam */}
      <path
        d="M52 30 q5 -7 0 -14 M68 30 q5 -7 0 -14"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}
