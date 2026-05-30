import { Search } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { ProductCard } from '@/features/pos/components/ProductCard'
import type { Product } from '@/types/product'

interface MenuPanelProps {
  products: Product[]
  query: string
  onQueryChange: (query: string) => void
  onAdd: (product: Product) => void
  isPending: boolean
  isError: boolean
}

/** Middle column: search (autofocus + `/` shortcut) over a responsive grid. */
export function MenuPanel({
  products,
  query,
  onQueryChange,
  onAdd,
  isPending,
  isError,
}: MenuPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent): void {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-stone-50">
      <div className="shrink-0 border-b border-stone-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onQueryChange('')
            }}
            placeholder="ค้นหาเมนู…  ( / )"
            aria-label="ค้นหาเมนู"
            className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isPending ? (
          <MenuSkeleton />
        ) : isError ? (
          <p className="py-12 text-center text-sm text-red-600">โหลดเมนูไม่สำเร็จ</p>
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-500">
            {query ? `ไม่พบเมนูที่ตรงกับ "${query}"` : 'ยังไม่มีเมนูในหมวดนี้'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-stone-200" />
      ))}
    </div>
  )
}
