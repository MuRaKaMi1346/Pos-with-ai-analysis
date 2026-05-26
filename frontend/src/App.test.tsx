import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders project heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /smartbrew pos/i, level: 1 })).toBeInTheDocument()
  })
})
