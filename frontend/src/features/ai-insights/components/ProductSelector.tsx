import { Label } from '@/components/ui/label'
import { useProducts } from '@/features/pos/api/products'

export function ProductSelector({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { data } = useProducts()
  return (
    <div className="space-y-1">
      <Label htmlFor="ai-product-select">เลือกเมนู</Label>
      <select
        id="ai-product-select"
        className="h-10 w-64 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
      >
        <option value="">— เลือกเมนู —</option>
        {(data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
