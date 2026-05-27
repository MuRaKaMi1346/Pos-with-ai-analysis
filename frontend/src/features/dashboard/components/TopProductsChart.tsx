import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { TopProductRow } from '@/types/dashboard'

export function TopProductsChart({
  data,
  isLoading,
}: {
  data: TopProductRow[] | undefined
  isLoading: boolean
}) {
  const rows = (data ?? []).slice(0, 10).map((r) => ({
    name: r.product_name,
    revenue: Number(r.revenue),
  }))
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>เมนูขายดี</CardTitle>
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
            <BarChart data={rows} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1' }}
              />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
