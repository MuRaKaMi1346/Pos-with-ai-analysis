import { describe, expect, it } from 'vitest'

import { nextChannel } from '@/features/pos/lib/channel'

describe('nextChannel', () => {
  it('cycles dine_in → takeaway → delivery → dine_in', () => {
    expect(nextChannel('dine_in')).toBe('takeaway')
    expect(nextChannel('takeaway')).toBe('delivery')
    expect(nextChannel('delivery')).toBe('dine_in')
  })
})
