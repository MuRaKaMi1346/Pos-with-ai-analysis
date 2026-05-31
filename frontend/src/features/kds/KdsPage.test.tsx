import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBumpTicket, useKdsTickets, useRecallTicket } from '@/features/kds/api/kds'
import { KdsPage } from '@/features/kds/KdsPage'
import type { KdsTicket } from '@/types/kds'

vi.mock('@/features/kds/api/kds', () => ({
  useKdsTickets: vi.fn(),
  useBumpTicket: vi.fn(),
  useRecallTicket: vi.fn(),
}))

function ticket(over: Partial<KdsTicket> = {}): KdsTicket {
  return {
    id: 1,
    order_id: 1,
    order_number: 'O1',
    table_number: null,
    channel: 'takeaway',
    station: 'bar',
    status: 'new',
    printed_at: '2026-05-31T09:58:00Z',
    bumped_at: null,
    lines: [{ order_item_id: 1, product_id: 1, product_name: 'Latte', qty: 1, modifiers: [] }],
    ...over,
  }
}

const bumpMutate = vi.fn()

beforeEach(() => {
  bumpMutate.mockReset()
  vi.mocked(useBumpTicket).mockReturnValue({
    mutate: bumpMutate,
  } as unknown as ReturnType<typeof useBumpTicket>)
  vi.mocked(useRecallTicket).mockReturnValue({
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useRecallTicket>)
})

function mockTickets(tickets: KdsTicket[], extra: Record<string, unknown> = {}): void {
  vi.mocked(useKdsTickets).mockReturnValue({
    data: tickets,
    isPending: false,
    isError: false,
    ...extra,
  } as unknown as ReturnType<typeof useKdsTickets>)
}

describe('KdsPage', () => {
  it('splits tickets into BAR and KITCHEN columns', () => {
    mockTickets([
      ticket({ id: 1, order_number: 'BAR1', station: 'bar' }),
      ticket({
        id: 2,
        order_number: 'KIT1',
        station: 'kitchen',
        lines: [{ order_item_id: 2, product_id: 2, product_name: 'Toast', qty: 1, modifiers: [] }],
      }),
    ])
    render(<KdsPage />)
    expect(screen.getByText('บาร์')).toBeInTheDocument()
    expect(screen.getByText('ครัว')).toBeInTheDocument()
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Toast')).toBeInTheDocument()
  })

  it('bumps a ticket on tap', async () => {
    mockTickets([ticket({ id: 7, order_number: 'O7', station: 'bar' })])
    render(<KdsPage />)
    await userEvent.click(screen.getByRole('button', { name: /เสร็จ O7/ }))
    expect(bumpMutate).toHaveBeenCalledWith(7)
  })

  it('shows an empty state in each column', () => {
    mockTickets([])
    render(<KdsPage />)
    expect(screen.getAllByText('ไม่มีรายการ')).toHaveLength(2)
  })
})
