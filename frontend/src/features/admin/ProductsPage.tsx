import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type ProductInput,
  useAdminProducts,
  useCreateProduct,
  useDeactivateProduct,
  useUpdateProduct,
  useUploadProductImage,
} from '@/features/admin/api/products'
import { ProductDialog } from '@/features/admin/components/ProductDialog'
import { useCategories } from '@/features/pos/api/products'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'

export function ProductsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const { data, isPending } = useAdminProducts(!showInactive)
  const { data: categories } = useCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const deactivate = useDeactivateProduct()
  const uploadImage = useUploadProductImage()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>(undefined)

  const categoryName = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of categories ?? []) map.set(c.id, c.name)
    return map
  }, [categories])

  async function handleSubmit(values: ProductInput): Promise<void> {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: values })
        toast.success('บันทึกสินค้าแล้ว')
      } else {
        await create.mutateAsync(values)
        toast.success('เพิ่มสินค้าแล้ว')
      }
      setDialogOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function toggleActive(p: Product): Promise<void> {
    try {
      if (p.is_active) {
        if (!window.confirm(`ปิดการขาย "${p.name}"?`)) return
        await deactivate.mutateAsync(p.id)
        toast.success('ปิดการขายแล้ว')
      } else {
        await update.mutateAsync({ id: p.id, data: { is_active: true } })
        toast.success('เปิดการขายแล้ว')
      }
    } catch {
      toast.error('ทำรายการไม่สำเร็จ')
    }
  }

  const rows = data ?? []

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">สินค้า</h1>
          <p className="text-sm text-text-muted">จัดการเมนู ราคา ต้นทุน และรหัสสแกน</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked)
              }}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            แสดงที่ปิดการขาย
          </label>
          <Button
            onClick={() => {
              setEditing(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> เพิ่มสินค้า
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">หมวด</th>
              <th className="px-4 py-3 text-right font-medium">ราคา</th>
              <th className="px-4 py-3 text-right font-medium">ต้นทุน</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  ยังไม่มีสินค้า — กด “เพิ่มสินค้า” เพื่อเริ่ม
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{p.name}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {p.category_id == null ? '—' : (categoryName.get(p.category_id) ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {formatCurrency(p.cost)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{p.sku ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="inline-flex rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                        ขายอยู่
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
                        ปิดการขาย
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(p)
                          setDialogOpen(true)
                        }}
                        aria-label={`แก้ไข ${p.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void toggleActive(p)
                        }}
                        aria-label={p.is_active ? `ปิดการขาย ${p.name}` : `เปิดการขาย ${p.name}`}
                      >
                        {p.is_active ? (
                          <PowerOff className="h-4 w-4 text-[var(--color-danger)]" />
                        ) : (
                          <Power className="h-4 w-4 text-[var(--color-success)]" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        categories={categories ?? []}
        onSubmit={(v) => {
          void handleSubmit(v)
        }}
        onUploadImage={(file) => uploadImage.mutateAsync(file)}
        isPending={create.isPending || update.isPending}
      />
    </div>
  )
}
