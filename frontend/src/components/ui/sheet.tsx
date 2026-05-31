/* eslint-disable react-refresh/only-export-components -- shadcn-style Radix re-exports */
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { type HTMLAttributes, forwardRef } from 'react'

import { cn } from '@/lib/utils'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = forwardRef<HTMLDivElement, SheetPrimitive.DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className)}
      {...props}
    />
  ),
)
SheetOverlay.displayName = 'SheetOverlay'

interface SheetContentProps extends SheetPrimitive.DialogContentProps {
  side?: 'right' | 'left'
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = 'right', ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-full max-w-sm flex-col gap-4 ' +
            'border-border bg-surface p-6 shadow-xl',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity ' +
              'hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  ),
)
SheetContent.displayName = 'SheetContent'

export const SheetHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export const SheetTitle = forwardRef<HTMLHeadingElement, SheetPrimitive.DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <SheetPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  ),
)
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = forwardRef<
  HTMLParagraphElement,
  SheetPrimitive.DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-muted', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'
