import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Keypad } from '@/components/ui/keypad'

describe('Keypad', () => {
  it('appends a digit to the current value', async () => {
    const onChange = vi.fn()
    render(<Keypad value="12" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenCalledWith('123')
  })

  it('backspace removes the last character', async () => {
    const onChange = vi.fn()
    render(<Keypad value="125" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'ลบ' }))
    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('clear empties the value', async () => {
    const onChange = vi.fn()
    render(<Keypad value="125" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'ล้าง' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('allows only a single decimal point', async () => {
    const onChange = vi.fn()
    render(<Keypad value="12.5" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '.' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
