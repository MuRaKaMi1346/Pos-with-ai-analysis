import { Lightbulb, ShoppingBasket, Sparkles, Star, TrendingDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StrategyResponse } from '@/types/ai'

const ICONS: Record<string, ReactNode> = {
  bundle: <ShoppingBasket className="h-5 w-5 text-blue-600" />,
  star: <Star className="h-5 w-5 text-amber-500" />,
  slow_mover: <TrendingDown className="h-5 w-5 text-red-600" />,
  high_margin: <Sparkles className="h-5 w-5 text-emerald-600" />,
}

function iconFor(type: string): ReactNode {
  return ICONS[type] ?? <Lightbulb className="h-5 w-5 text-slate-500" />
}

export function StrategyCards({
  data,
  isLoading,
}: {
  data: StrategyResponse | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return <p className="text-slate-500">กำลังโหลด insights…</p>
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      {data.summary_th && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" /> สรุปกลยุทธ์ประจำสัปดาห์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line leading-relaxed text-slate-700">
              {data.summary_th}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              ข้อมูลย้อนหลัง {data.days} วัน · สร้างเมื่อ{' '}
              {new Date(data.generated_at).toLocaleString('th-TH')}
            </p>
          </CardContent>
        </Card>
      )}

      {data.insights.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            ยังไม่มี insight — ต้องมีบิลในระบบสักช่วงเวลาก่อน
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.insights.map((insight, idx) => (
            <Card key={`${insight.type}-${idx}`}>
              <CardContent className="flex gap-3 p-4">
                <div className="rounded-md bg-slate-100 p-2 flex items-start">
                  {iconFor(insight.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{insight.title}</p>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
