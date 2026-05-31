import { createPortal } from 'react-dom'

import { ReceiptPreview } from '@/features/pos/components/ReceiptPreview'
import type { Receipt } from '@/types/receipt'

/**
 * Body-level copy of the receipt for printing — rendered outside the dialog's
 * transformed subtree so the `@media print` rules in index.css can isolate it
 * at the page origin. Hidden on screen; `window.print()` prints just this.
 */
export function ReceiptPrintLayer({ receipt }: { receipt: Receipt }) {
  return createPortal(
    <div className="receipt-print">
      <ReceiptPreview receipt={receipt} />
    </div>,
    document.body,
  )
}
