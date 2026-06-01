import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChartCard } from '@/features/dashboard/components/ChartCard'

describe('ChartCard', () => {
  it('renders the title and children when data is present', () => {
    render(
      <ChartCard title="ยอดขายแนวโน้ม" isLoading={false} isEmpty={false}>
        <div>plot</div>
      </ChartCard>,
    )
    expect(screen.getByText('ยอดขายแนวโน้ม')).toBeInTheDocument()
    expect(screen.getByText('plot')).toBeInTheDocument()
  })

  it('hides children and shows the empty label when empty', () => {
    render(
      <ChartCard title="เมนูขายดี" isLoading={false} isEmpty emptyLabel="ยังไม่มีบิลในช่วงนี้">
        <div>plot</div>
      </ChartCard>,
    )
    expect(screen.queryByText('plot')).not.toBeInTheDocument()
    expect(screen.getByText('ยังไม่มีบิลในช่วงนี้')).toBeInTheDocument()
  })

  it('hides children while loading', () => {
    render(
      <ChartCard title="สัดส่วนหมวด" isLoading isEmpty={false}>
        <div>plot</div>
      </ChartCard>,
    )
    expect(screen.queryByText('plot')).not.toBeInTheDocument()
  })
})
