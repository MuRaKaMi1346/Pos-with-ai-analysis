import { Minus, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { CartLine } from '@/features/pos/stores/cartStore'
import { formatCurrency } from '@/lib/utils'

export function CartItem({
  line,
  onInc,
  onDec,
  onRemove,
}: {
  line: CartLine
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  const subtotal = Number(line.product.price) * line.qty
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{line.product.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(line.product.price)} × {line.qty}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDec}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center font-medium">{line.qty}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onInc}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <span className="w-20 text-right font-semibold">{formatCurrency(subtotal)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:bg-red-50"
        onClick={onRemove}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
