import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u

describe('LoginHeroFallback', () => {
  it('renders a decorative svg with no emoji', () => {
    const { getByTestId, container } = render(<LoginHeroFallback className="h-10 w-10" />)
    const svg = getByTestId('login-hero-fallback')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('aria-hidden')
    expect(svg).toHaveClass('h-10', 'w-10')
    expect(EMOJI.test(container.textContent ?? '')).toBe(false)
  })
})
