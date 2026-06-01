import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useIngredients } from '@/features/admin/api/ingredients'
import {
  type RecipeLineInput,
  useCreateRecipe,
  useDeleteRecipe,
  useRecipes,
} from '@/features/admin/api/recipes'
import { RecipeLineDialog } from '@/features/admin/components/RecipeLineDialog'
import { useProducts } from '@/features/pos/api/products'
import { UNIT_LABELS, type Ingredient } from '@/types/ingredient'

function fmtQty(s: string): string {
  const n = Number(s)
  return Number.isFinite(n) ? n.toLocaleString('th-TH', { maximumFractionDigits: 4 }) : s
}

export function RecipesPage() {
  const products = useProducts()
  const ingredients = useIngredients(true)
  const [productId, setProductId] = useState<number | null>(null)
  const recipes = useRecipes(productId)
  const create = useCreateRecipe()
  const remove = useDeleteRecipe()
  const [dialogOpen, setDialogOpen] = useState(false)

  const activeProducts = useMemo(
    () => (products.data ?? []).filter((p) => p.is_active),
    [products.data],
  )
  const ingById = useMemo(() => {
    const map = new Map<number, Ingredient>()
    for (const ing of ingredients.data ?? []) map.set(ing.id, ing)
    return map
  }, [ingredients.data])

  async function handleAdd(values: RecipeLineInput): Promise<void> {
    if (productId === null) return
    try {
      await create.mutateAsync({ product_id: productId, ...values })
      toast.success('เพิ่มวัตถุดิบในสูตรแล้ว')
      setDialogOpen(false)
    } catch {
      toast.error('เพิ่มไม่สำเร็จ')
    }
  }

  async function handleDelete(id: number, name: string): Promise<void> {
    if (!window.confirm(`ลบ "${name}" ออกจากสูตร?`)) return
    try {
      await remove.mutateAsync(id)
      toast.success('ลบแล้ว')
    } catch {
      toast.error('ลบไม่สำเร็จ')
    }
  }

  const lines = recipes.data ?? []

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">สูตร (BOM)</h1>
          <p className="text-sm text-text-muted">กำหนดวัตถุดิบที่ใช้ต่อเมนู — ใช้ตัดสต็อกอัตโนมัติ</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="recipe-product" className="text-xs font-medium text-text-muted">
              เลือกเมนู
            </label>
            <select
              id="recipe-product"
              value={productId ?? ''}
              onChange={(e) => {
                setProductId(e.target.value === '' ? null : Number(e.target.value))
              }}
              className="h-10 w-60 rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">— เลือกเมนู —</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              setDialogOpen(true)
            }}
            disabled={productId === null || (ingredients.data ?? []).length === 0}
          >
            <Plus className="h-4 w-4" /> เพิ่มวัตถุดิบ
          </Button>
        </div>
      </header>

      {productId === null ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-muted">
          เลือกเมนูเพื่อดูและแก้ไขสูตร
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                <th className="px-4 py-3 font-medium">วัตถุดิบ</th>
                <th className="px-4 py-3 text-right font-medium">ปริมาณต่อหน่วย</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {recipes.isPending ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-text-muted">
                    กำลังโหลด…
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-text-muted">
                    ยังไม่มีวัตถุดิบในสูตรนี้
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const name = ingById.get(line.ingredient_id)?.name ?? `#${line.ingredient_id}`
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-text">{name}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text">
                        {fmtQty(line.qty)}{' '}
                        <span className="text-xs text-text-muted">{UNIT_LABELS[line.unit]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void handleDelete(line.id, name)
                          }}
                          aria-label={`ลบ ${name}`}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <RecipeLineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ingredients={ingredients.data ?? []}
        onSubmit={(v) => {
          void handleAdd(v)
        }}
        isPending={create.isPending}
      />
    </div>
  )
}
