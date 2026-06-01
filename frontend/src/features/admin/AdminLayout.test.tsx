import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AdminLayout } from '@/features/admin/AdminLayout'

describe('AdminLayout', () => {
  it('renders the section sub-nav', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /วัตถุดิบ/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /คลังสต็อก/ })).toBeInTheDocument()
  })
})
