import { useMemo, useState } from 'react'

import { useCategories, useProducts } from '@/features/pos/api/products'
import { Cart } from '@/features/pos/components/Cart'
import { CategoryRail } from '@/features/pos/components/CategoryRail'
import { MenuPanel } from '@/features/pos/components/MenuPanel'
import { ModifierDialog } from '@/features/pos/components/ModifierDialog'
import { PosTopBar } from '@/features/pos/components/PosTopBar'
import { categoryCounts, filterProducts } from '@/features/pos/lib/filterProducts'
import { useCartStore } from '@/features/pos/stores/cartStore'
import type { Product } from '@/types/product'

/** Three-column POS workspace (spec §5.1): category rail · menu · ticket. */
export function PosPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const { data: products, isPending, isError } = useProducts()
  const { data: categories } = useCategories()

  const channel = useCartStore((s) => s.channel)
  const setChannel = useCartStore((s) => s.setChannel)
  const tableNumber = useCartStore((s) => s.tableNumber)
  const setTableNumber = useCartStore((s) => s.setTableNumber)
  const addLine = useCartStore((s) => s.addLine)

  // Products with options open the modifier picker; the rest drop straight in.
  const [modifierTarget, setModifierTarget] = useState<Product | null>(null)
  function handleAdd(product: Product): void {
    if (product.has_modifiers) {
      setModifierTarget(product)
    } else {
      addLine(product)
    }
  }

  const items = useMemo(() => products ?? [], [products])
  // Counts on the search-filtered set so the rail badges track the query.
  const queryMatches = useMemo(
    () => filterProducts(items, { categoryId: null, query }),
    [items, query],
  )
  const counts = useMemo(() => categoryCounts(queryMatches), [queryMatches])
  // The grid additionally narrows to the selected category.
  const visible = useMemo(
    () =>
      selectedCategoryId === null
        ? queryMatches
        : queryMatches.filter((p) => p.category_id === selectedCategoryId),
    [queryMatches, selectedCategoryId],
  )

  return (
    <div className="flex h-full flex-col">
      <PosTopBar
        orderNumber={null}
        channel={channel}
        onChannelChange={setChannel}
        tableNumber={tableNumber}
        onTableChange={setTableNumber}
        heldCount={0}
      />
      <div className="flex min-h-0 flex-1">
        <CategoryRail
          categories={categories ?? []}
          counts={counts}
          totalCount={queryMatches.length}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
        <MenuPanel
          products={visible}
          query={query}
          onQueryChange={setQuery}
          onAdd={handleAdd}
          isPending={isPending}
          isError={isError}
        />
        <aside className="w-[380px] shrink-0 overflow-hidden p-3">
          <Cart />
        </aside>
      </div>

      <ModifierDialog
        product={modifierTarget}
        open={modifierTarget !== null}
        onOpenChange={(o) => {
          if (!o) setModifierTarget(null)
        }}
        onConfirm={(modifiers, note) => {
          if (modifierTarget) addLine(modifierTarget, modifiers, note)
          setModifierTarget(null)
        }}
      />
    </div>
  )
}
