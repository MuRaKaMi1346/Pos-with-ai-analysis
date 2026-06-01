import { type InputHTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 ' +
          'text-sm text-text placeholder:text-text-muted focus-visible:outline-none ' +
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ' +
          'focus-visible:ring-offset-[var(--color-bg)] ' +
          'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
