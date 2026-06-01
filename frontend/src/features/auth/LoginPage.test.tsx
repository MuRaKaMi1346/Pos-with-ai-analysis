import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Drive reduced motion so the glow stays static; the design is pure CSS/SVG, so
// there is never a WebGL canvas to mount.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: vi.fn(() => true) }
})
// Stub the form so the page test doesn't need the auth/query/router stack.
vi.mock('@/features/auth/components/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form" />,
}))

import { LoginPage } from '@/features/auth/LoginPage'

describe('LoginPage', () => {
  it('renders the centered card with brand mark, heading and form, no WebGL canvas', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'ยินดีต้อนรับกลับมา' })).toBeInTheDocument()
    expect(screen.getByTestId('login-hero-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
