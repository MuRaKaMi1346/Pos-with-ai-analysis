import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { SalesTrendResponse } from '@/types/dashboard'

export function SalesTrendChart({
  data,
  isLoading,
}: {
  data: SalesTrendResponse | undefined
  isLoading: boolean
}) {
  const points = (data?.points ?? []).map((p) => ({
    bucket: p.bucket,
    revenue: Number(p.revenue),
    orders: p.order_count,
  }))
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>ยอดขายแนวโน้ม</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            กำลังโหลด…
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            ยังไม่มีข้อมูลในช่วงนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ left: 0, right: 20, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={64} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
