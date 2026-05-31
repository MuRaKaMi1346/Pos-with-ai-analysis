import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePosShortcuts, type PosShortcutHandlers } from '@/features/pos/hooks/usePosShortcuts'

function Harness(props: PosShortcutHandlers) {
  usePosShortcuts(props)
  return null
}

describe('usePosShortcuts', () => {
  it('routes ⌘K + the F-keys to the provided handlers', () => {
    const handlers = {
      onPalette: vi.fn(),
      onCustomer: vi.fn(),
      onToggleChannel: vi.fn(),
      onHold: vi.fn(),
      onCharge: vi.fn(),
    }
    render(<Harness {...handlers} />)

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    fireEvent.keyDown(window, { key: 'F2' })
    fireEvent.keyDown(window, { key: 'F4' })
    fireEvent.keyDown(window, { key: 'F8' })
    fireEvent.keyDown(window, { key: 'F9' })

    expect(handlers.onPalette).toHaveBeenCalledTimes(1)
    expect(handlers.onCustomer).toHaveBeenCalledTimes(1)
    expect(handlers.onToggleChannel).toHaveBeenCalledTimes(1)
    expect(handlers.onHold).toHaveBeenCalledTimes(1)
    expect(handlers.onCharge).toHaveBeenCalledTimes(1)
  })

  it('ignores keys with no handler bound', () => {
    const onPalette = vi.fn()
    render(<Harness onPalette={onPalette} />)
    fireEvent.keyDown(window, { key: 'F2' }) // no onCustomer → no-op
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(onPalette).toHaveBeenCalledTimes(1)
  })
})
