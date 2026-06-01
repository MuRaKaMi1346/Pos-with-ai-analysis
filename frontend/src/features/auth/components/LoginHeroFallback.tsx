interface Props {
  className?: string
}

/**
 * Refined SmartBrew brand mark — a clean ceramic espresso cup on a saucer with
 * a soft warm gradient (replaces the old low-poly 3D cup). Pure decorative SVG
 * (`aria-hidden`); used in the login hero medallion and form header.
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
        <linearGradient id="brew-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c79a6e" />
          <stop offset="1" stopColor="#6f4a2c" />
        </linearGradient>
        <linearGradient id="brew-saucer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a5e3a" />
          <stop offset="1" stopColor="#5a3d24" />
        </linearGradient>
      </defs>

      {/* steam — three soft ribbons */}
      <path
        d="M50 28 c-7 -7 7 -12 0 -21"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M62 27 c-7 -7 7 -12 0 -21"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M74 28 c-7 -7 7 -12 0 -21"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* handle */}
      <path
        d="M87 51 a17 17 0 0 1 0 27"
        stroke="#5a3d24"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* body */}
      <path
        d="M33 45 h56 l-6 35 a11 11 0 0 1 -11 9 H50 a11 11 0 0 1 -11 -9 z"
        fill="url(#brew-body)"
      />
      {/* soft shine */}
      <path d="M40 49 h11 l-4 37 H47 a8 8 0 0 1 -5 -7 z" fill="#ffffff" opacity="0.14" />

      {/* rim + coffee surface */}
      <ellipse cx="61" cy="45" rx="28" ry="8" fill="#5a3d24" />
      <ellipse cx="61" cy="43" rx="28" ry="8" fill="#8a5e3a" />
      <ellipse cx="61" cy="43" rx="21" ry="5.5" fill="#3a2417" />

      {/* saucer */}
      <ellipse cx="61" cy="98" rx="40" ry="9" fill="url(#brew-saucer)" />
      <ellipse cx="61" cy="96" rx="40" ry="8.5" fill="#9a6c44" />
    </svg>
  )
}
