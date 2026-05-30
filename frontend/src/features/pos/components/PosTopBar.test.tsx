import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PosTopBar } from '@/features/pos/components/PosTopBar'

function setup(over: Partial<Parameters<typeof PosTopBar>[0]> = {}) {
  const onChannelChange = vi.fn()
  const onTableChange = vi.fn()
  const onOpenHeld = vi.fn()
  render(
    <PosTopBar
      orderNumber={null}
      channel="takeaway"
      onChannelChange={onChannelChange}
      tableNumber=""
      onTableChange={onTableChange}
      heldCount={0}
      onOpenHeld={onOpenHeld}
      {...over}
    />,
  )
  return { onChannelChange, onTableChange, onOpenHeld }
}

describe('PosTopBar', () => {
  it('shows "New Sale" when there is no order number', () => {
    setup()
    expect(screen.getByText('New Sale')).toBeInTheDocument()
  })

  it('renders the order number once a bill exists', () => {
    setup({ orderNumber: '20260530-0042' })
    expect(screen.getByText('20260530-0042')).toBeInTheDocument()
  })

  it('renders all three channel options and marks the active one', () => {
    setup({ channel: 'takeaway' })
    expect(screen.getByRole('button', { name: 'ทานที่ร้าน' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เดลิเวอรี่' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'กลับบ้าน' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChannelChange when another channel is tapped', async () => {
    const { onChannelChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'ทานที่ร้าน' }))
    expect(onChannelChange).toHaveBeenCalledWith('dine_in')
  })

  it('hides the table input unless the channel is dine-in', () => {
    setup({ channel: 'takeaway' })
    expect(screen.queryByLabelText('หมายเลขโต๊ะ')).not.toBeInTheDocument()
  })

  it('shows the table input for dine-in and reports edits', async () => {
    const { onTableChange } = setup({ channel: 'dine_in' })
    await userEvent.type(screen.getByLabelText('หมายเลขโต๊ะ'), 'A')
    expect(onTableChange).toHaveBeenCalledWith('A')
  })

  it('renders a held-tickets badge with the count', () => {
    setup({ heldCount: 3 })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('opens the held-tickets drawer when the hold button is tapped', async () => {
    const { onOpenHeld } = setup()
    await userEvent.click(screen.getByRole('button', { name: /พักบิล/ }))
    expect(onOpenHeld).toHaveBeenCalled()
  })
})
