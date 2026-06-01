import { Brain, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  useDailyStrategy,
  useForecast,
  usePurchaseSuggestion,
  useTrainModels,
} from '@/features/ai-insights/api/ai'
import { ForecastChart } from '@/features/ai-insights/components/ForecastChart'
import { ProductSelector } from '@/features/ai-insights/components/ProductSelector'
import { PurchaseSuggestionTable } from '@/features/ai-insights/components/PurchaseSuggestionTable'
import { StrategyCards } from '@/features/ai-insights/components/StrategyCards'
import { useProducts } from '@/features/pos/api/products'

export function AiInsightsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const products = useProducts()
  // Default to the first product when none is picked, derived during render
  const productId = selectedId ?? products.data?.[0]?.id ?? null

  const forecast = useForecast(productId, 14)
  const suggestion = usePurchaseSuggestion(14)
  const strategy = useDailyStrategy(30)
  const train = useTrainModels()

  async function handleTrain(): Promise<void> {
    try {
      const result = await train.mutateAsync()
      toast.success(
        `เทรน ${result.trained.length} เมนูสำเร็จ (ข้าม ${result.skipped.length} เมนูที่ข้อมูลน้อย)`,
      )
    } catch {
      toast.error('เทรนโมเดลไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Brain className="h-6 w-6 text-purple-600" /> AI Insights
          </h1>
          <p className="text-sm text-text-muted">
            พยากรณ์ยอดขาย · แนะนำสั่งวัตถุดิบ · กลยุทธ์ภาษาไทยจาก Ollama
          </p>
        </div>
        <Button onClick={handleTrain} disabled={train.isPending}>
          <RefreshCw className={train.isPending ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
          {train.isPending ? 'กำลังเทรน…' : 'เทรนโมเดลใหม่'}
        </Button>
      </div>

      <ProductSelector value={productId} onChange={setSelectedId} />

      <ForecastChart
        data={forecast.data}
        isLoading={forecast.isPending && productId !== null}
        isEmpty={productId === null}
      />

      <PurchaseSuggestionTable data={suggestion.data} isLoading={suggestion.isPending} />

      <StrategyCards data={strategy.data} isLoading={strategy.isPending} />
    </div>
  )
}
