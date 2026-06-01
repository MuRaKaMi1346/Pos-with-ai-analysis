import { render, screen } from '@testing-library/react'
import { useReducedMotion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TiltCard } from '@/components/ui/TiltCard'

// Keep framer-motion real except useReducedMotion, which we drive per test.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => false) }
})

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

describe('TiltCard', () => {
  it('renders its children', () => {
    render(
      <TiltCard>
        <span>ยอดขาย</span>
      </TiltCard>,
    )
    expect(screen.getByText('ยอดขาย')).toBeInTheDocument()
  })

  it('renders the parallax gloss by default', () => {
    render(<TiltCard>content</TiltCard>)
    expect(screen.getByTestId('tilt-glare')).toBeInTheDocument()
  })

  it('omits the gloss when glare is disabled', () => {
    render(<TiltCard glare={false}>content</TiltCard>)
    expect(screen.queryByTestId('tilt-glare')).not.toBeInTheDocument()
  })

  it('drops the gloss under reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    render(<TiltCard>content</TiltCard>)
    expect(screen.queryByTestId('tilt-glare')).not.toBeInTheDocument()
  })
})
