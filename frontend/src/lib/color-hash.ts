// Warm, low-saturation gradient pairs (espresso → caramel → cream) for the
// emoji-free product fallback (pos-ui-motion §4.2).
const PALETTE: { from: string; to: string }[] = [
  { from: '#4b3621', to: '#7c5a3e' }, // espresso
  { from: '#5a3e2b', to: '#8a6240' }, // mocha
  { from: '#6b4423', to: '#a9743f' }, // amber-brown
  { from: '#7a5230', to: '#b9824f' }, // caramel
  { from: '#6e5a44', to: '#a8906f' }, // taupe
  { from: '#8a6a45', to: '#c4a06f' }, // latte
  { from: '#5f4636', to: '#917259' }, // cocoa
  { from: '#7d6a4f', to: '#bca683' }, // cream
]

const FALLBACK = { from: '#4b3621', to: '#7c5a3e' }

/** Stable 31-based string hash (deterministic, non-negative). */
export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Pick a stable gradient pair for `name` from the warm palette. */
export function gradientFromName(name: string): { from: string; to: string } {
  return PALETTE[hashString(name) % PALETTE.length] ?? FALLBACK
}
