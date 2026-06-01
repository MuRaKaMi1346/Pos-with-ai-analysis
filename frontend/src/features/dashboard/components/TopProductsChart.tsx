import { useReducedMotion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartCard } from '@/features/dashboard/components/ChartCard'
import {
  axisTick,
  gridStroke,
  tooltipContentStyle,
  tooltipLabelStyle,
} from '@/features/dashboard/components/chart-theme'
import { formatCurrency } from '@/lib/utils'
import type { TopProductRow } from '@/types/dashboard'

export function TopProductsChart({
  data,
  isLoading,
}: {
  data: TopProductRow[] | undefined
  isLoading: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const rows = (data ?? []).slice(0, 10).map((r) => ({
    name: r.product_name,
    revenue: Number(r.revenue),
  }))

  return (
    <ChartCard
      title="เมนูขายดี"
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyLabel="ยังไม่มีบิลในช่วงนี้"
      index={1}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} layout="vertical" margin={{ left: 16, right: 24 }}>
          <defs>
            <linearGradient id="topBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-chart-5)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--color-chart-5)" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={axisTick}
            width={110}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-2)' }}
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
          />
          <Bar dataKey="revenue" fill="url(#topBar)" radius={[0, 6, 6, 0]} isAnimationActive={!reduced} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
