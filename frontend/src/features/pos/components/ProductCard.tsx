import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (product: Product) => void
}) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-square bg-slate-100">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
            ☕
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-medium">{product.name}</h3>
        <p className="text-lg font-semibold">{formatCurrency(product.price)}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-auto"
          onClick={() => {
            onAdd(product)
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> เพิ่มลงตะกร้า
        </Button>
      </div>
    </Card>
  )
}
