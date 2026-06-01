import { afterEach, describe, expect, it, vi } from 'vitest'

import { animateThemeChange } from '@/lib/theme-transition'

type Doc = { startViewTransition?: (cb: () => void) => unknown }

afterEach(() => {
  delete (document as unknown as Doc).startViewTransition
})

describe('animateThemeChange', () => {
  it('applies instantly when the View Transitions API is unavailable', () => {
    const apply = vi.fn()
    animateThemeChange(apply)
    expect(apply).toHaveBeenCalledOnce()
  })

  it('runs apply inside a transition and animates the reveal when supported', async () => {
    const apply = vi.fn()
    const animate = vi.fn()
    document.documentElement.animate = animate as unknown as typeof document.documentElement.animate
    ;(document as unknown as Doc).startViewTransition = (cb: () => void) => {
      cb()
      return { ready: Promise.resolve(), finished: Promise.resolve() }
    }

    animateThemeChange(apply, { x: 10, y: 10 })

    expect(apply).toHaveBeenCalledOnce()
    await Promise.resolve()
    await Promise.resolve()
    expect(animate).toHaveBeenCalled()
  })
})
