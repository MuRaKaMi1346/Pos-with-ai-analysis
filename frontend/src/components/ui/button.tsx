import { Slot } from '@radix-ui/react-slot'
import { type VariantProps, cva } from 'class-variance-authority'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-primary focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[var(--color-bg)] ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Strong neutral that flips with the theme (dark button in light mode,
        // light button in dark mode) — uses the text/bg tokens.
        default: 'bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90',
        destructive: 'bg-[var(--color-danger)] text-white hover:opacity-90',
        outline: 'border border-border bg-surface text-text hover:bg-surface-2',
        ghost: 'text-text hover:bg-surface-2',
        link: 'text-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    )
  },
)
Button.displayName = 'Button'
