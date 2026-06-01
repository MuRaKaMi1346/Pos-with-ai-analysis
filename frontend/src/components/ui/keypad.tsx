import { Delete } from 'lucide-react'

import { cn } from '@/lib/utils'

interface KeypadProps {
  value: string
  onChange: (next: string) => void
  className?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

/** Big touch keypad for tablet entry (spec §5.9): 0–9, dot, backspace, clear. */
export function Keypad({ value, onChange, className }: KeypadProps) {
  function press(key: (typeof KEYS)[number]): void {
    if (key === 'back') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '.') {
      if (value.includes('.')) return
      onChange(value === '' ? '0.' : value + '.')
      return
    }
    const next = value === '0' ? key : value + key
    const decimals = next.split('.')[1]
    if (decimals !== undefined && decimals.length > 2) return
    onChange(next)
  }

  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === 'back' ? 'ลบ' : key}
          onClick={() => {
            press(key)
          }}
          className="flex h-14 items-center justify-center rounded-lg border border-border text-xl font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-surface-2"
        >
          {key === 'back' ? <Delete className="h-5 w-5" /> : key}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          onChange('')
        }}
        className="col-span-3 flex h-12 items-center justify-center rounded-lg border border-border text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        ล้าง
      </button>
    </div>
  )
}
