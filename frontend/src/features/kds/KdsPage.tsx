import { useEffect, useState } from 'react'

import { useBumpTicket, useKdsTickets, useRecallTicket } from '@/features/kds/api/kds'
import { KdsTicketCard } from '@/features/kds/components/KdsTicketCard'
import type { KdsTicket } from '@/types/kds'

/** Done tickets sink to the bottom; the rest run oldest-first (most urgent). */
function sortTickets(tickets: KdsTicket[]): KdsTicket[] {
  return [...tickets].sort((a, b) => {
    const doneA = a.status === 'done' ? 1 : 0
    const doneB = b.status === 'done' ? 1 : 0
    if (doneA !== doneB) return doneA - doneB
    return a.printed_at.localeCompare(b.printed_at)
  })
}

/** Kitchen display (spec §5.12): BAR + KITCHEN columns of live tickets. */
export function KdsPage() {
  const { data: tickets, isPending, isError } = useKdsTickets()
  const bump = useBumpTicket()
  const recall = useRecallTicket()
  const all = tickets ?? []

  // Tick a clock so age colours advance between polls (Date.now() directly in
  // render is impure — react-hooks/purity).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
    }, 30000)
    return () => {
      clearInterval(id)
    }
  }, [])

  return (
    <div className="flex h-full gap-4 p-4">
      <KdsColumn
        title="บาร์"
        tickets={sortTickets(all.filter((t) => t.station === 'bar'))}
        now={now}
        isPending={isPending}
        isError={isError}
        onBump={bump.mutate}
        onRecall={recall.mutate}
      />
      <KdsColumn
        title="ครัว"
        tickets={sortTickets(all.filter((t) => t.station === 'kitchen'))}
        now={now}
        isPending={isPending}
        isError={isError}
        onBump={bump.mutate}
        onRecall={recall.mutate}
      />
    </div>
  )
}

interface KdsColumnProps {
  title: string
  tickets: KdsTicket[]
  now: number
  isPending: boolean
  isError: boolean
  onBump: (id: number) => void
  onRecall: (id: number) => void
}

function KdsColumn({ title, tickets, now, isPending, isError, onBump, onRecall }: KdsColumnProps) {
  const activeCount = tickets.filter((t) => t.status !== 'done').length
  return (
    <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface-2">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="font-semibold text-text">{title}</h2>
        <span className="rounded-full bg-border px-2 py-0.5 text-xs tabular-nums text-text-muted">
          {activeCount}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {isPending ? (
          <p className="py-8 text-center text-sm text-text-muted">กำลังโหลด…</p>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-600">โหลดคิวไม่สำเร็จ</p>
        ) : tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">ไม่มีรายการ</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((ticket) => (
              <KdsTicketCard
                key={ticket.id}
                ticket={ticket}
                now={now}
                onBump={onBump}
                onRecall={onRecall}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
