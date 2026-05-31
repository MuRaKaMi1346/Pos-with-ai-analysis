import { m, useReducedMotion } from 'framer-motion'

import { lineSubtotal, type TicketLine } from '@/features/pos/stores/cartStore'
import { variants } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'

/** A receipt-style ticket line. Tapping it opens the line-edit sheet. */
export function TicketLineRow({ line, onClick }: { line: TicketLine; onClick: () => void }) {
  const reduced = useReducedMotion() ?? false
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 border-b border-border py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2"
    >
      {/* Keyed by qty so the count pops (popIn) whenever it changes. */}
      <m.span
        key={line.qty}
        variants={reduced ? undefined : variants.popIn}
        initial={reduced ? false : 'hidden'}
        animate={reduced ? false : 'visible'}
        className="mt-0.5 inline-block w-7 shrink-0 text-sm font-semibold tabular-nums text-text-muted"
      >
        {line.qty}×
      </m.span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{line.product.name}</p>
        {line.modifiers.length > 0 && (
          <p className="truncate text-xs text-text-muted">
            {line.modifiers.map((m) => m.name).join(', ')}
          </p>
        )}
        {line.note && <p className="truncate text-xs italic text-text-muted">“{line.note}”</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
        {formatCurrency(lineSubtotal(line))}
      </span>
    </button>
  )
}
