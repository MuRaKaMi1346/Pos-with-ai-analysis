import { render, screen } from '@testing-library/react'
import { useReducedMotion } from 'framer-motion'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginHero } from '@/features/auth/components/LoginHero'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => false) }
})

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false)
})

describe('LoginHero', () => {
  it('renders the brand wordmark and the feature highlights', () => {
    render(<LoginHero />)
    expect(screen.getByText('SmartBrew POS')).toBeInTheDocument()
    expect(screen.getByText('ขายไว ปิดบิลไม่สะดุด')).toBeInTheDocument()
    expect(screen.getByText('รายงานยอดขายเรียลไทม์')).toBeInTheDocument()
    expect(screen.getByTestId('login-hero-fallback')).toBeInTheDocument()
  })

  it('renders without a WebGL canvas (no R3F)', () => {
    render(<LoginHero />)
    expect(document.querySelector('canvas')).toBeNull()
  })
})
