import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  lookupProductByCode,
  productModifiersKey,
  useCategories,
  useHeldOrders,
  useProducts,
  useResumeOrder,
} from '@/features/pos/api/products'
import { Cart } from '@/features/pos/components/Cart'
import { CategoryRail } from '@/features/pos/components/CategoryRail'
import { CommandPalette } from '@/features/pos/components/CommandPalette'
import { CustomerSearchDialog } from '@/features/pos/components/CustomerSearchDialog'
import { HeldTicketsDrawer } from '@/features/pos/components/HeldTicketsDrawer'
import { MenuPanel } from '@/features/pos/components/MenuPanel'
import { ModifierDialog } from '@/features/pos/components/ModifierDialog'
import { PosTopBar } from '@/features/pos/components/PosTopBar'
import { categoryCounts, filterProducts } from '@/features/pos/lib/filterProducts'
import { orderToTicketLines } from '@/features/pos/lib/resumeOrder'
import { useCartStore } from '@/features/pos/stores/cartStore'
import { apiClient } from '@/lib/api/client'
import type { ModifierGroup } from '@/types/modifier'
import type { Order } from '@/types/order'
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
  const loadOrder = useCartStore((s) => s.loadOrder)
  const customer = useCartStore((s) => s.customer)
  const setCustomer = useCartStore((s) => s.setCustomer)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K opens the quick-search + barcode palette (spec §5.8).
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Products with options open the modifier picker; the rest drop straight in.
  const [modifierTarget, setModifierTarget] = useState<Product | null>(null)
  function handleAdd(product: Product): void {
    if (product.has_modifiers) {
      setModifierTarget(product)
    } else {
      addLine(product)
    }
  }

  // ── Held tickets (M15) ────────────────────────────────────────────
  const { data: heldOrders, isPending: heldPending } = useHeldOrders()
  const resumeOrder = useResumeOrder()
  const queryClient = useQueryClient()
  const [heldOpen, setHeldOpen] = useState(false)
  const [resumingId, setResumingId] = useState<number | null>(null)

  async function handleResume(order: Order): Promise<void> {
    setResumingId(order.id)
    try {
      const resumed = await resumeOrder.mutateAsync(order.id)
      // The order read snapshots modifier price deltas but not names — fetch
      // them per distinct product so resumed lines read properly.
      const nameById = new Map<number, string>()
      const productIds = [...new Set(resumed.items.map((i) => i.product_id))]
      await Promise.all(
        productIds.map(async (pid) => {
          const groups = await queryClient.fetchQuery({
            queryKey: productModifiersKey(pid),
            queryFn: async () =>
              (await apiClient.get<ModifierGroup[]>(`/products/${pid}/modifiers`)).data,
          })
          for (const group of groups) {
            for (const m of group.modifiers) nameById.set(m.id, m.name)
          }
        }),
      )
      const productById = new Map((products ?? []).map((p) => [p.id, p]))
      loadOrder({
        lines: orderToTicketLines(resumed.items, productById, nameById),
        channel: resumed.channel,
        tableNumber: resumed.table_number ?? '',
      })
      setHeldOpen(false)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'เรียกคืนบิลไม่สำเร็จ')
    } finally {
      setResumingId(null)
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
        heldCount={heldOrders?.length ?? 0}
        onOpenHeld={() => {
          setHeldOpen(true)
        }}
        customer={customer}
        onOpenCustomer={() => {
          setCustomerOpen(true)
        }}
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

      <HeldTicketsDrawer
        open={heldOpen}
        onOpenChange={setHeldOpen}
        orders={heldOrders ?? []}
        isPending={heldPending}
        resumingId={resumingId}
        onResume={handleResume}
      />

      <CustomerSearchDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        customer={customer}
        onAttach={setCustomer}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        products={items}
        lookup={lookupProductByCode}
        onSelect={handleAdd}
      />
    </div>
  )
}
