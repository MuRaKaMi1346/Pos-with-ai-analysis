import { m, useReducedMotion } from 'framer-motion'
import { Clock, Hash, Keyboard, Rows2, Star, User } from 'lucide-react'
import { useState } from 'react'

import { ShortcutsDialog } from '@/features/pos/components/ShortcutsDialog'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
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
  const density = useUiStore((s) => s.density)
  const toggleDensity = useUiStore((s) => s.toggleDensity)
  const reduced = useReducedMotion() ?? false
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: -12 }}
      animate={reduced ? false : { opacity: 1, y: 0 }}
      transition={spring.snappy}
      className="flex shrink-0 items-center gap-4 border-b border-black/20 bg-surface-ink px-4 py-2.5 text-stone-100"
    >
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider text-stone-400">
          {orderNumber ? 'บิล' : 'การขาย'}
        </span>
        <span className="font-semibold tabular-nums">{orderNumber ?? 'New Sale'}</span>
      </div>

      <ChannelToggle channel={channel} onChannelChange={onChannelChange} reduced={reduced} />

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
            className="h-9 w-28 rounded-md border border-stone-700 bg-stone-800 pl-8 pr-2 text-sm text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDensity}
          aria-pressed={density === 'compact'}
          title={density === 'compact' ? 'ความหนาแน่น: แน่น' : 'ความหนาแน่น: ปกติ'}
          aria-label="สลับความหนาแน่น"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 transition-colors hover:bg-stone-800',
            density === 'compact' ? 'text-primary' : 'text-stone-300',
          )}
        >
          <Rows2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShortcutsOpen(true)
          }}
          title="คีย์ลัด"
          aria-label="คีย์ลัด"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-700 text-stone-300 transition-colors hover:bg-stone-800"
        >
          <Keyboard className="h-4 w-4" />
        </button>
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
              <span className="flex items-center gap-1 text-primary">
                <Star className="h-3.5 w-3.5 fill-current" />
                {customer.loyalty_points}
              </span>
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
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg">
              {heldCount}
            </span>
          )}
        </button>
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </m.div>
  )
}

/** Segmented channel control with a pill that glides to the active option. */
function ChannelToggle({
  channel,
  onChannelChange,
  reduced,
}: {
  channel: OrderChannel
  onChannelChange: (channel: OrderChannel) => void
  reduced: boolean
}) {
  const activeIndex = Math.max(
    CHANNELS.findIndex((c) => c.value === channel),
    0,
  )

  return (
    <div
      role="group"
      aria-label="ช่องทางการขาย"
      className="relative grid grid-cols-3 rounded-lg bg-black/20 p-1"
    >
      {/* Equal-width segments → the pill only needs a transform to slide. */}
      <m.div
        aria-hidden
        data-testid="channel-pill"
        className="pointer-events-none absolute inset-y-1 left-1 rounded-md bg-primary"
        style={{ width: 'calc((100% - 0.5rem) / 3)' }}
        initial={false}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={reduced ? { duration: 0 } : spring.snappy}
      />
      {CHANNELS.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-pressed={channel === c.value}
          onClick={() => {
            onChannelChange(c.value)
          }}
          className={cn(
            'relative z-10 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            channel === c.value ? 'text-primary-fg' : 'text-stone-300 hover:text-white',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
