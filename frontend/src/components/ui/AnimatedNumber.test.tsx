import { render, screen } from '@testing-library/react'
import { useReducedMotion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => false) }
})

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

describe('AnimatedNumber', () => {
  it('renders the formatted starting value', () => {
    render(<AnimatedNumber value={1234} />)
    expect(screen.getByText(/1,234\.00/)).toBeInTheDocument()
  })

  it('applies tabular-nums to avoid width jitter', () => {
    render(<AnimatedNumber value={42} className="text-text" />)
    const el = screen.getByText(/42\.00/)
    expect(el).toHaveClass('tabular-nums', 'text-text')
  })

  it('supports a custom formatter', () => {
    render(<AnimatedNumber value={3} format={(n) => `${n} ชิ้น`} />)
    expect(screen.getByText('3 ชิ้น')).toBeInTheDocument()
  })

  it('renders the value directly under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    render(<AnimatedNumber value={500} />)
    expect(screen.getByText(/500\.00/)).toBeInTheDocument()
  })
})
