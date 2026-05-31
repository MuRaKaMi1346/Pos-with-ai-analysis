import { describe, expect, it } from 'vitest'

import { gradientFromName, hashString } from '@/lib/color-hash'

describe('color-hash', () => {
  it('hashString is deterministic and non-negative', () => {
    expect(hashString('Latte')).toBe(hashString('Latte'))
    expect(hashString('Mocha')).toBeGreaterThanOrEqual(0)
  })

  it('gradientFromName is stable per name', () => {
    expect(gradientFromName('Latte')).toEqual(gradientFromName('Latte'))
  })

  it('returns a from/to pair of hex colours', () => {
    const g = gradientFromName('Cold Brew')
    expect(g.from).toMatch(/^#[0-9a-f]{6}$/i)
    expect(g.to).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
