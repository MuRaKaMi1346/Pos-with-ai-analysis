import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProductFallback } from '@/components/ui/ProductFallback'

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u

describe('ProductFallback', () => {
  it('renders a deterministic SVG (snapshot) for a Latin name', () => {
    const { container } = render(<ProductFallback name="Latte" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('renders a deterministic SVG (snapshot) for a Thai name', () => {
    const { container } = render(<ProductFallback name="ลาเต้เย็น" />)
    expect(container.firstChild).toMatchSnapshot()
  })

  it('never renders an emoji in its text content', () => {
    const { container } = render(<ProductFallback name="Mocha 🍵" />)
    expect(EMOJI.test(container.textContent ?? '')).toBe(false)
  })
})
