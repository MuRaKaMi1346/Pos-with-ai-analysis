import { Plus } from 'lucide-react'

import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'

/** Full-bleed clickable card (large touch target). Tap adds to the ticket. */
export function ProductCard({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (product: Product) => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onAdd(product)
      }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      <div className="aspect-square w-full bg-stone-100">
        {product.image ? (
          <img src={product.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-stone-300">
            ☕
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-stone-800">
          {product.name}
        </h3>
        <p className="mt-auto text-base font-semibold tabular-nums text-stone-900">
          {formatCurrency(product.price)}
        </p>
      </div>
      <span
        aria-hidden
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Plus className="h-4 w-4" />
      </span>
    </button>
  )
}
