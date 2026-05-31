import { gradientFromName, hashString } from '@/lib/color-hash'
import { getInitials } from '@/lib/initials'

/**
 * Deterministic, emoji-free product image fallback (pos-ui-motion §4.1):
 * a warm gradient (hashed from the name) + a low-poly coffee-cup silhouette +
 * the product monogram. Pure SVG; decorative (the card is the labelled button).
 */
export function ProductFallback({ name, className }: { name: string; className?: string }) {
  const { from, to } = gradientFromName(name)
  const initials = getInitials(name)
  const gradId = `pf-${hashString(name).toString(36)}`

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradId})`} />

      {/* Low-poly cup silhouette (behind the monogram). */}
      <g>
        <polygon points="31,32 69,32 66,38 34,38" fill="rgba(255,255,255,0.18)" />
        <polygon points="34,34 66,34 60,72 40,72" fill="rgba(255,255,255,0.13)" />
        <polygon points="66,44 78,47 76,60 66,57" fill="rgba(255,255,255,0.10)" />
        <polygon points="33,72 67,72 62,80 38,80" fill="rgba(0,0,0,0.07)" />
      </g>

      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={initials.length > 1 ? 30 : 40}
        fontWeight={700}
        fill="rgba(255,255,255,0.94)"
      >
        {initials}
      </text>
    </svg>
  )
}
