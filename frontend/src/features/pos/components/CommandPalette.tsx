import { Search } from 'lucide-react'
import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { filterProducts } from '@/features/pos/lib/filterProducts'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Product[]
  /** Resolve a scanned SKU / barcode to a product (null when unknown). */
  lookup: (code: string) => Promise<Product | null>
  onSelect: (product: Product) => void
}

/** ⌘K palette: type a name or scan a barcode + Enter to add (spec §5.8). */
export function CommandPalette({
  open,
  onOpenChange,
  products,
  lookup,
  onSelect,
}: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CommandPaletteBody
          products={products}
          lookup={lookup}
          onSelect={(product) => {
            onSelect(product)
            onOpenChange(false)
          }}
        />
      )}
    </Dialog>
  )
}

function CommandPaletteBody({
  products,
  lookup,
  onSelect,
}: {
  products: Product[]
  lookup: (code: string) => Promise<Product | null>
  onSelect: (product: Product) => void
}) {
  const [query, setQuery] = useState('')
  const matches = filterProducts(products, { categoryId: null, query }).slice(0, 8)

  // Enter: scanners send the full code first, so try an exact code lookup, then
  // fall back to the top name match.
  async function commit(): Promise<void> {
    const code = query.trim()
    if (!code) return
    const scanned = await lookup(code)
    if (scanned) {
      onSelect(scanned)
      return
    }
    const top = matches[0]
    if (top) onSelect(top)
  }

  return (
    <DialogContent className="w-full max-w-lg gap-0 overflow-hidden p-0">
      <DialogTitle className="sr-only">ค้นหาเมนูหรือสแกนบาร์โค้ด</DialogTitle>
      <DialogDescription className="sr-only">
        พิมพ์ชื่อเมนูหรือสแกนบาร์โค้ดแล้วกด Enter
      </DialogDescription>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void commit()
            }
          }}
          placeholder="ค้นหาเมนู หรือสแกนบาร์โค้ด…"
          aria-label="ค้นหาเมนูหรือบาร์โค้ด"
          className="h-12 flex-1 bg-transparent text-sm focus-visible:outline-none"
        />
      </div>
      <ul className="max-h-80 overflow-y-auto p-2">
        {matches.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-text-muted">ไม่พบเมนู</li>
        ) : (
          matches.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(product)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate font-medium text-text">{product.name}</span>
                <span className="shrink-0 tabular-nums text-text-muted">
                  {formatCurrency(product.price)}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </DialogContent>
  )
}
