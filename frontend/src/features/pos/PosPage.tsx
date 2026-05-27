import { Cart } from '@/features/pos/components/Cart'
import { MenuGrid } from '@/features/pos/components/MenuGrid'

export function PosPage() {
  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">เมนู</h1>
        <MenuGrid />
      </section>
      <aside>
        <Cart />
      </aside>
    </div>
  )
}
