import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { KdsTicketCard } from '@/features/kds/components/KdsTicketCard'
import type { KdsTicket } from '@/types/kds'

const now = new Date('2026-05-31T10:00:00Z').getTime()

function ticket(over: Partial<KdsTicket> = {}): KdsTicket {
  return {
    id: 1,
    order_id: 1,
    order_number: '20260531-0001',
    table_number: 'A3',
    channel: 'dine_in',
    station: 'bar',
    status: 'new',
    printed_at: '2026-05-31T09:58:00Z',
    bumped_at: null,
    lines: [
      { order_item_id: 1, product_id: 1, product_name: 'Latte', qty: 2, modifiers: ['Extra shot'] },
    ],
    ...over,
  }
}

describe('KdsTicketCard', () => {
  it('renders order, table, age, lines + modifiers', () => {
    render(<KdsTicketCard ticket={ticket()} now={now} onBump={vi.fn()} onRecall={vi.fn()} />)
    expect(screen.getByText('20260531-0001')).toBeInTheDocument()
    expect(screen.getByText(/A3/)).toBeInTheDocument()
    expect(screen.getByText('2 นาที')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Extra shot')).toBeInTheDocument()
  })

  it('bumps an active ticket when tapped', async () => {
    const onBump = vi.fn()
    render(<KdsTicketCard ticket={ticket()} now={now} onBump={onBump} onRecall={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /เสร็จ 20260531-0001/ }))
    expect(onBump).toHaveBeenCalledWith(1)
  })

  it('offers recall (not bump) on a done ticket', async () => {
    const onBump = vi.fn()
    const onRecall = vi.fn()
    render(
      <KdsTicketCard
        ticket={ticket({ status: 'done' })}
        now={now}
        onBump={onBump}
        onRecall={onRecall}
      />,
    )
    expect(screen.queryByRole('button', { name: /เสร็จ/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'เรียกคืน' }))
    expect(onRecall).toHaveBeenCalledWith(1)
    expect(onBump).not.toHaveBeenCalled()
  })
})
