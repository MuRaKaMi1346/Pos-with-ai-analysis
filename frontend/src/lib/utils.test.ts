import { describe, expect, it } from 'vitest'

import { cn, formatCurrency } from '@/lib/utils'

describe('cn', () => {
  it('merges conflicting Tailwind classes (later wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })
})

describe('formatCurrency', () => {
  it('formats a numeric string as Thai baht with 2 decimals', () => {
    const result = formatCurrency('65')
    // Locale formatting differs slightly across runtimes — assert essentials
    expect(result).toMatch(/65\.00/)
    expect(result).toMatch(/฿|THB/)
  })

  it('formats a number', () => {
    const result = formatCurrency(130.5)
    expect(result).toMatch(/130\.50/)
  })

  it('returns a safe fallback for non-numeric input', () => {
    expect(formatCurrency('not-a-number')).toMatch(/0\.00/)
  })
})
