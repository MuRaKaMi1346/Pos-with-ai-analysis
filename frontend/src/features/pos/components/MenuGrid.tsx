import { useProducts } from '@/features/pos/api/products'
import { ProductCard } from '@/features/pos/components/ProductCard'
import { useCartStore } from '@/features/pos/stores/cartStore'

export function MenuGrid() {
  const { data, isPending, isError } = useProducts()
  const add = useCartStore((s) => s.add)

  if (isPending) {
    return <div className="text-slate-500">กำลังโหลด…</div>
  }
  if (isError) {
    return <div className="text-red-600">โหลดเมนูไม่สำเร็จ</div>
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
        ยังไม่มีเมนู — admin เพิ่มผ่าน <code>POST /api/v1/products/</code>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {data.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={add} />
      ))}
    </div>
  )
}
