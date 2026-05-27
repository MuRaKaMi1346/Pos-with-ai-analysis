import { Banknote, Receipt, TrendingUp, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { SummaryResponse } from '@/types/dashboard'

interface KpiCardSpec {
  label: string
  value: string
  icon: ReactNode
}

export function KpiCards({ summary }: { summary: SummaryResponse | undefined }) {
  const cards: KpiCardSpec[] = [
    {
      label: 'ยอดขายรวม',
      value: summary ? formatCurrency(summary.total_revenue) : '—',
      icon: <Banknote className="h-5 w-5 text-blue-600" />,
    },
    {
      label: 'จำนวนบิล',
      value: summary ? summary.order_count.toLocaleString('th-TH') : '—',
      icon: <Receipt className="h-5 w-5 text-purple-600" />,
    },
    {
      label: 'กำไรขั้นต้น',
      value: summary ? formatCurrency(summary.gross_profit) : '—',
      icon: <TrendingUp className="h-5 w-5 text-green-600" />,
    },
    {
      label: 'ยอดต่อบิลเฉลี่ย',
      value: summary ? formatCurrency(summary.average_ticket) : '—',
      icon: <Wallet className="h-5 w-5 text-amber-600" />,
    },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold">{card.value}</p>
            </div>
            <div className="rounded-full bg-slate-100 p-3">{card.icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
