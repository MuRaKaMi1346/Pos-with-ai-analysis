import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Drive reduced motion so the aurora/parallax stay static; the design is pure
// CSS/SVG now, so there is never a WebGL canvas to mount.
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
  it('renders the brand hero and the sign-in form, with no WebGL canvas', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    // Brand wordmark appears in both the hero and the form header.
    expect(screen.getAllByText('SmartBrew POS').length).toBeGreaterThanOrEqual(1)
    expect(document.querySelector('canvas')).toBeNull()
  })
})
