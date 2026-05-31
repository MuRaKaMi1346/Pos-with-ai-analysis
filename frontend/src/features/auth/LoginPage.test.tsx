import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Reduced motion → the static fallback renders and the lazy R3F chunk (WebGL,
// unavailable in jsdom) is never mounted.
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
  it('shows the static hero (not the 3D canvas) under reduced motion, with the form', () => {
    render(<LoginPage />)
    expect(screen.getByTestId('login-hero-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
