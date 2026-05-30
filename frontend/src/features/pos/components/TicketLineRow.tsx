import { lineSubtotal, type TicketLine } from '@/features/pos/stores/cartStore'
import { formatCurrency } from '@/lib/utils'

/** A receipt-style ticket line. Tapping it opens the line-edit sheet. */
export function TicketLineRow({ line, onClick }: { line: TicketLine; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 border-b border-stone-100 py-2.5 text-left transition-colors last:border-0 hover:bg-stone-50"
    >
      <span className="mt-0.5 w-7 shrink-0 text-sm font-semibold tabular-nums text-stone-500">
        {line.qty}×
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-800">{line.product.name}</p>
        {line.modifiers.length > 0 && (
          <p className="truncate text-xs text-stone-500">
            {line.modifiers.map((m) => m.name).join(', ')}
          </p>
        )}
        {line.note && <p className="truncate text-xs italic text-stone-400">“{line.note}”</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">
        {formatCurrency(lineSubtotal(line))}
      </span>
    </button>
  )
}
