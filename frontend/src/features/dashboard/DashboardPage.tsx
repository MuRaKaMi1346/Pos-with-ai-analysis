import { useState } from 'react'

import {
  type DateRange,
  useCategoryMix,
  usePeakHours,
  useSalesTrend,
  useSummary,
  useTopProducts,
} from '@/features/dashboard/api/dashboard'
import { CategoryMixChart } from '@/features/dashboard/components/CategoryMixChart'
import { DateRangePicker } from '@/features/dashboard/components/DateRangePicker'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { PeakHoursHeatmap } from '@/features/dashboard/components/PeakHoursHeatmap'
import { SalesTrendChart } from '@/features/dashboard/components/SalesTrendChart'
import { TopProductsChart } from '@/features/dashboard/components/TopProductsChart'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultRange(): DateRange {
  const today = new Date()
  const sixDaysAgo = new Date(today)
  sixDaysAgo.setDate(today.getDate() - 6)
  return { from: isoDate(sixDaysAgo), to: isoDate(today) }
}

export function DashboardPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)

  const summary = useSummary(range)
  const trend = useSalesTrend(range, 'day')
  const top = useTopProducts(range, 10)
  const peak = usePeakHours(range)
  const mix = useCategoryMix(range)

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Dashboard</h1>
          <p className="text-sm text-text-muted">ภาพรวมยอดขาย กำไร และช่วงเวลาขายดี</p>
        </div>
        <DateRangePicker {...range} onChange={setRange} />
      </header>

      <KpiCards summary={summary.data} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesTrendChart data={trend.data} isLoading={trend.isPending} />
        </div>
        <TopProductsChart data={top.data} isLoading={top.isPending} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PeakHoursHeatmap data={peak.data} isLoading={peak.isPending} />
        </div>
        <CategoryMixChart data={mix.data} isLoading={mix.isPending} />
      </div>
    </div>
  )
}
