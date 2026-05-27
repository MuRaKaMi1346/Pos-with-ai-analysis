import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { LoginForm } from '@/features/auth/components/LoginForm'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  )
}

describe('LoginForm', () => {
  it('renders username + password + submit', () => {
    renderWithRouter()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เข้าสู่ระบบ/ })).toBeInTheDocument()
  })

  it('password field has type=password', () => {
    renderWithRouter()
    const pwd = screen.getByLabelText(/password/i)
    expect(pwd).toHaveAttribute('type', 'password')
  })
})
