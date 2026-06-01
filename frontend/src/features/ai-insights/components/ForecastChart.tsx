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
import type { ForecastResponse } from '@/types/ai'

export function ForecastChart({
  data,
  isLoading,
  isEmpty,
}: {
  data: ForecastResponse | undefined
  isLoading: boolean
  isEmpty: boolean
}) {
  const points = (data?.points ?? []).map((p) => ({
    date: p.date,
    qty: Math.round(p.predicted_qty * 100) / 100,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>พยากรณ์ยอดขาย {data?.horizon ?? 14} วันถัดไป</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[280px] items-center justify-center text-text-muted">
            เลือกเมนูเพื่อดูพยากรณ์
          </div>
        ) : isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-text-muted">
            กำลังโหลด…
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-text-muted">
            ยังไม่มีโมเดล — กด <span className="px-1 font-medium">เทรนโมเดล</span> ก่อน
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                width={56}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
              <Line
                type="monotone"
                dataKey="qty"
                stroke="var(--color-chart-3)"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
