import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware className merger. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const _baht = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
})

/** Format a Decimal-string or number as Thai baht (e.g. "฿65.00"). */
export function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '฿0.00'
  return _baht.format(n)
}
