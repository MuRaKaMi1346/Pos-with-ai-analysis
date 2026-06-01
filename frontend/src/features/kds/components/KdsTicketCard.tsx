import { Button } from '@/components/ui/button'
import { ageLevel, ticketAgeMinutes, type AgeLevel } from '@/features/kds/lib/kdsAge'
import { cn } from '@/lib/utils'
import type { KdsTicket } from '@/types/kds'

const BORDER: Record<AgeLevel, string> = {
  fresh: 'border-l-green-500',
  warning: 'border-l-amber-500',
  late: 'border-l-red-500',
}

const AGE_TEXT: Record<AgeLevel, string> = {
  fresh: 'text-green-600',
  warning: 'text-amber-600',
  late: 'text-red-600',
}

interface KdsTicketCardProps {
  ticket: KdsTicket
  /** `Date.now()` from the page render, so age stays deterministic + testable. */
  now: number
  onBump: (id: number) => void
  onRecall: (id: number) => void
}

/** One kitchen ticket: tap an active card to bump; done cards offer recall (§5.12). */
export function KdsTicketCard({ ticket, now, onBump, onRecall }: KdsTicketCardProps) {
  const minutes = ticketAgeMinutes(ticket.printed_at, now)
  const level = ageLevel(minutes)
  const isDone = ticket.status === 'done'

  const header = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-semibold tabular-nums text-text">{ticket.order_number}</span>
      <span className="flex items-center gap-2 text-xs">
        {ticket.table_number && <span className="text-text-muted">โต๊ะ {ticket.table_number}</span>}
        <span className={cn('font-medium tabular-nums', AGE_TEXT[level])}>{minutes} นาที</span>
      </span>
    </div>
  )

  const lines = (
    <ul className="mt-2 flex flex-col gap-1">
      {ticket.lines.map((line) => (
        <li key={line.order_item_id} className="text-sm">
          <div className="flex gap-2">
            <span className="font-semibold tabular-nums text-text-muted">{line.qty}×</span>
            <span className="text-text">{line.product_name}</span>
          </div>
          {line.modifiers.length > 0 && (
            <p className="pl-6 text-xs text-text-muted">{line.modifiers.join(', ')}</p>
          )}
        </li>
      ))}
    </ul>
  )

  if (isDone) {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-3 opacity-60">
        {header}
        {lines}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            onRecall(ticket.id)
          }}
        >
          เรียกคืน
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        onBump(ticket.id)
      }}
      aria-label={`เสร็จ ${ticket.order_number}`}
      className={cn(
        'w-full rounded-lg border border-l-4 border-border bg-surface p-3 text-left shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        BORDER[level],
      )}
    >
      {header}
      {lines}
      <p className="mt-2 text-center text-xs font-medium text-text-muted">แตะเมื่อเสร็จ</p>
    </button>
  )
}
