import { useReducedMotion } from 'framer-motion'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { tooltipContentStyle, tooltipLabelStyle } from '@/features/dashboard/components/chart-theme'
import { chartSeries } from '@/lib/design-tokens'
import { formatCurrency } from '@/lib/utils'
import type { CategoryMixRow } from '@/types/dashboard'

export function CategoryMixChart({
  data,
  isLoading,
}: {
  data: CategoryMixRow[] | undefined
  isLoading: boolean
}) {
  const reduced = useReducedMotion() ?? false
  const rows = (data ?? []).map((r) => ({
    name: r.category_name,
    value: Number(r.revenue),
    share: Number(r.share_pct),
  }))

  return (
    <ChartCard
      title="สัดส่วนหมวด"
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyLabel="ยังไม่มีบิลในช่วงนี้"
      index={1}
    >
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            stroke="var(--color-surface)"
            strokeWidth={2}
            label={({ name, percent }) =>
              `${String(name ?? '')} ${(Number(percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
            isAnimationActive={!reduced}
          >
            {rows.map((_, idx) => (
              <Cell key={idx} fill={chartSeries[idx % chartSeries.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
