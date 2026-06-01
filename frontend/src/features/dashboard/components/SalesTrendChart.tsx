import { useReducedMotion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartCard } from '@/features/dashboard/components/ChartCard'
import {
  axisTick,
  gridStroke,
  tooltipContentStyle,
  tooltipLabelStyle,
} from '@/features/dashboard/components/chart-theme'
import { formatCurrency } from '@/lib/utils'
import type { SalesTrendResponse } from '@/types/dashboard'

export function SalesTrendChart({
  data,
  isLoading,
}: {
  data: SalesTrendResponse | undefined
  isLoading: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const points = (data?.points ?? []).map((p) => ({
    bucket: p.bucket,
    revenue: Number(p.revenue),
    orders: p.order_count,
  }))

  return (
    <ChartCard title="ยอดขายแนวโน้ม" isLoading={isLoading} isEmpty={points.length === 0} index={0}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={points} margin={{ left: 0, right: 20, top: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="bucket" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} width={64} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-chart-1)"
            strokeWidth={2.5}
            fill="url(#trendArea)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={!reduced}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
