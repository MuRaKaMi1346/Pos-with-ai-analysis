/** Circular-reveal theme switch via the View Transitions API. */

interface ViewTransition {
  ready: Promise<void>
  finished: Promise<void>
}
type StartViewTransition = (callback: () => void) => ViewTransition

interface Origin {
  /** Viewport pixel coordinates the reveal expands from (e.g. the toggle button). */
  x: number
  y: number
}

/** Reveal duration — long enough to read the wipe, short enough to feel instant-ish. */
const REVEAL_MS = 460

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
}

/**
 * Apply a theme change with an expanding-circle reveal of the new theme,
 * originating at `origin`. Uses the View Transitions API to snapshot the old
 * UI and clip-reveal the new one over it (compositor-driven). Falls back to an
 * instant `apply()` when the API is unavailable (Firefox, older Safari) or the
 * user prefers reduced motion — the toggle always works either way.
 */
export function animateThemeChange(apply: () => void, origin?: Origin): void {
  const doc =
    typeof document !== 'undefined'
      ? (document as Document & { startViewTransition?: StartViewTransition })
      : undefined

  if (!doc || typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    apply()
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  // Radius to the farthest corner so the circle covers the whole viewport.
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const transition = doc.startViewTransition(() => {
    apply()
  })

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
        },
        {
          duration: REVEAL_MS,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {
      // A superseded transition (rapid re-toggle) rejects `ready` — safe to ignore.
    })
}
