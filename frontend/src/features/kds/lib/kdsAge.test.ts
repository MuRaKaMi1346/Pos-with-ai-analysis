import { describe, expect, it } from 'vitest'

import { ageLevel, ticketAgeMinutes } from '@/features/kds/lib/kdsAge'

describe('ticketAgeMinutes', () => {
  it('computes whole minutes since printed', () => {
    const now = new Date('2026-05-31T10:00:00Z').getTime()
    expect(ticketAgeMinutes('2026-05-31T09:53:00Z', now)).toBe(7)
  })

  it('clamps a future timestamp to 0', () => {
    const now = new Date('2026-05-31T10:00:00Z').getTime()
    expect(ticketAgeMinutes('2026-05-31T10:05:00Z', now)).toBe(0)
  })
})

describe('ageLevel', () => {
  it('bands fresh / warning / late at the 5 and 10 minute marks', () => {
    expect(ageLevel(0)).toBe('fresh')
    expect(ageLevel(4)).toBe('fresh')
    expect(ageLevel(5)).toBe('warning')
    expect(ageLevel(9)).toBe('warning')
    expect(ageLevel(10)).toBe('late')
    expect(ageLevel(25)).toBe('late')
  })
})
