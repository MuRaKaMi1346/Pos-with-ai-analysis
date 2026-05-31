import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyMenu } from '@/components/illustrations/EmptyMenu'
import { MenuError } from '@/components/illustrations/MenuError'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u

describe('menu illustrations', () => {
  it('EmptyMenu renders a decorative svg with no emoji', () => {
    const { getByTestId, container } = render(<EmptyMenu className="h-10 w-10" />)
    const svg = getByTestId('empty-menu-illustration')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('aria-hidden')
    expect(svg).toHaveClass('h-10', 'w-10')
    expect(EMOJI.test(container.textContent ?? '')).toBe(false)
  })

  it('MenuError renders a decorative svg with no emoji', () => {
    const { getByTestId, container } = render(<MenuError className="h-10 w-10" />)
    const svg = getByTestId('menu-error-illustration')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('aria-hidden')
    expect(EMOJI.test(container.textContent ?? '')).toBe(false)
  })
})
