import { useEffect, useRef } from 'react'

export interface PosShortcutHandlers {
  /** Ctrl/⌘+K — command palette. */
  onPalette?: () => void
  /** F2 — customer search. */
  onCustomer?: () => void
  /** F4 — toggle channel. */
  onToggleChannel?: () => void
  /** F8 — hold ticket. */
  onHold?: () => void
  /** F9 — charge. */
  onCharge?: () => void
}

/**
 * POS keyboard shortcuts (spec §5.14). Only the handlers you pass are bound, so
 * the page can own palette/customer/channel while the cart owns hold/charge.
 * (`/` lives on the search input; Esc is handled by the dialogs themselves.)
 */
export function usePosShortcuts(handlers: PosShortcutHandlers): void {
  // Keep the latest handlers in a ref so the listener binds once. The ref is
  // synced in an effect (writing ref.current during render trips
  // react-hooks/refs).
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const h = ref.current
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (h.onPalette) {
          e.preventDefault()
          h.onPalette()
        }
        return
      }
      const action =
        e.key === 'F2'
          ? h.onCustomer
          : e.key === 'F4'
            ? h.onToggleChannel
            : e.key === 'F8'
              ? h.onHold
              : e.key === 'F9'
                ? h.onCharge
                : undefined
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])
}
