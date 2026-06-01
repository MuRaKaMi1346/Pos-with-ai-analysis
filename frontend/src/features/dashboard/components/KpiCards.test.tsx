import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { KpiCards } from '@/features/dashboard/components/KpiCards'
import type { SummaryResponse } from '@/types/dashboard'

const summary: SummaryResponse = {
  from: '2026-05-01',
  to: '2026-05-07',
  total_revenue: '12345.50',
  order_count: 87,
  gross_profit: '4567.25',
  average_ticket: '141.90',
}

describe('KpiCards', () => {
  it('renders every KPI label', () => {
    render(<KpiCards summary={summary} />)
    expect(screen.getByText('ยอดขายรวม')).toBeInTheDocument()
    expect(screen.getByText('จำนวนบิล')).toBeInTheDocument()
    expect(screen.getByText('กำไรขั้นต้น')).toBeInTheDocument()
    expect(screen.getByText('ยอดต่อบิลเฉลี่ย')).toBeInTheDocument()
  })

  it('shows a placeholder dash while the summary is loading', () => {
    render(<KpiCards summary={undefined} />)
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  it('renders the order count as a plain integer (no currency symbol)', () => {
    render(<KpiCards summary={summary} />)
    expect(screen.getByText('87')).toBeInTheDocument()
  })
})
