import { Clock, Hash, User } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Customer } from '@/types/customer'
import type { OrderChannel } from '@/types/order'

const CHANNELS: { value: OrderChannel; label: string }[] = [
  { value: 'dine_in', label: 'ทานที่ร้าน' },
  { value: 'takeaway', label: 'กลับบ้าน' },
  { value: 'delivery', label: 'เดลิเวอรี่' },
]

interface PosTopBarProps {
  orderNumber: string | null
  channel: OrderChannel
  onChannelChange: (channel: OrderChannel) => void
  tableNumber: string
  onTableChange: (table: string) => void
  /** Held-tickets badge count + drawer opener (M15). */
  heldCount: number
  onOpenHeld: () => void
  /** Attached customer (null = walk-in) + opener (M15). */
  customer: Customer | null
  onOpenCustomer: () => void
}

/** Dark "command bar" sub-bar for the POS route (spec §5.13). */
export function PosTopBar({
  orderNumber,
  channel,
  onChannelChange,
  tableNumber,
  onTableChange,
  heldCount,
  onOpenHeld,
  customer,
  onOpenCustomer,
}: PosTopBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-stone-800 bg-stone-900 px-4 py-2.5 text-stone-100">
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          {orderNumber ? 'บิล' : 'การขาย'}
        </span>
        <span className="font-semibold tabular-nums">{orderNumber ?? 'New Sale'}</span>
      </div>

      <div
        className="flex items-center gap-1 rounded-lg bg-stone-800 p-1"
        role="group"
        aria-label="ช่องทางการขาย"
      >
        {CHANNELS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={channel === c.value}
            onClick={() => {
              onChannelChange(c.value)
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              channel === c.value
                ? 'bg-amber-500 text-stone-900'
                : 'text-stone-300 hover:bg-stone-700',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {channel === 'dine_in' && (
        <div className="relative">
          <Hash className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            value={tableNumber}
            onChange={(e) => {
              onTableChange(e.target.value)
            }}
            placeholder="โต๊ะ"
            aria-label="หมายเลขโต๊ะ"
            maxLength={16}
            className="h-9 w-28 rounded-md border border-stone-700 bg-stone-800 pl-8 pr-2 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCustomer}
          title="แนบลูกค้า"
          className="flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-200 transition-colors hover:bg-stone-800"
        >
          <User className="h-4 w-4" />
          {customer ? (
            <span className="flex items-center gap-1">
              <span className="max-w-[10rem] truncate">{customer.name}</span>
              <span className="text-amber-400">⭐ {customer.loyalty_points}</span>
            </span>
          ) : (
            'Walk-in'
          )}
        </button>
        <button
          type="button"
          onClick={onOpenHeld}
          title="บิลที่พักไว้"
          className="relative flex items-center gap-2 rounded-lg border border-stone-700 px-3 py-1.5 text-sm text-stone-200 transition-colors hover:bg-stone-800"
        >
          <Clock className="h-4 w-4" /> พักบิล
          {heldCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-stone-900">
              {heldCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
