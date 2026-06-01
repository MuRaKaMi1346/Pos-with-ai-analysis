import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

// Drive reduced motion so the glow/float stay static; the design is pure
// CSS/SVG, so there is never a WebGL canvas to mount.
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
  it('renders the layered card with brand mark, heading and form, no WebGL canvas', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'ยินดีต้อนรับกลับมา' })).toBeInTheDocument()
    expect(screen.getByTestId('login-hero-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('defaults to dark and toggles to light mode', async () => {
    render(<LoginPage />)
    // Dark default → the toggle offers switching to light.
    const toToLight = screen.getByRole('button', { name: 'สลับเป็นโหมดสว่าง' })
    await userEvent.click(toToLight)
    // After toggling, it offers switching back to dark.
    expect(screen.getByRole('button', { name: 'สลับเป็นโหมดมืด' })).toBeInTheDocument()
  })
})
