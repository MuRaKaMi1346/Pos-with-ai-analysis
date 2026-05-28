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
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            เลือกเมนูเพื่อดูพยากรณ์
          </div>
        ) : isLoading ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            กำลังโหลด…
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            ยังไม่มีโมเดล — กด <span className="px-1 font-medium">เทรนโมเดล</span> ก่อน
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#cbd5e1' }} />
              <Line
                type="monotone"
                dataKey="qty"
                stroke="#10b981"
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
