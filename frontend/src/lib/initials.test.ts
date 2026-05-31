import { describe, expect, it } from 'vitest'

import { getInitials } from '@/lib/initials'

describe('getInitials', () => {
  it('takes the first letter of the first two words (Latin)', () => {
    expect(getInitials('Iced Latte')).toBe('IL')
    expect(getInitials('Espresso')).toBe('E')
  })

  it('takes the first character for Thai names', () => {
    expect(getInitials('ลาเต้')).toBe('ล')
  })

  it('skips emoji and other non-letters', () => {
    expect(getInitials('Mocha \u{1F375}')).toBe('M')
    expect(getInitials('—Cold Brew')).toBe('CB')
  })

  it('falls back to ? for blank input', () => {
    expect(getInitials('   ')).toBe('?')
  })
})
