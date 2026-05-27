import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { CategoryMixRow } from '@/types/dashboard'

const COLORS = ['#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444']

export function CategoryMixChart({
  data,
  isLoading,
}: {
  data: CategoryMixRow[] | undefined
  isLoading: boolean
}) {
  const rows = (data ?? []).map((r) => ({
    name: r.category_name,
    value: Number(r.revenue),
    share: Number(r.share_pct),
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>สัดส่วนหมวด</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            กำลังโหลด…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            ยังไม่มีบิลในช่วงนี้
          </div>
        ) : (
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
                label={({ name, percent }) =>
                  `${String(name ?? '')} ${(Number(percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {rows.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
