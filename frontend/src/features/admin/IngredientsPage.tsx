import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type IngredientInput,
  useCreateIngredient,
  useDeactivateIngredient,
  useIngredients,
  useUpdateIngredient,
} from '@/features/admin/api/ingredients'
import { IngredientDialog } from '@/features/admin/components/IngredientDialog'
import { UNIT_LABELS, type Ingredient } from '@/types/ingredient'

export function IngredientsPage() {
  const [showInactive, setShowInactive] = useState(false)
  const { data, isPending } = useIngredients(!showInactive)
  const create = useCreateIngredient()
  const update = useUpdateIngredient()
  const deactivate = useDeactivateIngredient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | undefined>(undefined)

  function openCreate(): void {
    setEditing(undefined)
    setDialogOpen(true)
  }
  function openEdit(ingredient: Ingredient): void {
    setEditing(ingredient)
    setDialogOpen(true)
  }

  async function handleSubmit(values: IngredientInput): Promise<void> {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: values })
        toast.success('บันทึกวัตถุดิบแล้ว')
      } else {
        await create.mutateAsync(values)
        toast.success('เพิ่มวัตถุดิบแล้ว')
      }
      setDialogOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function toggleActive(ingredient: Ingredient): Promise<void> {
    try {
      if (ingredient.is_active) {
        if (!window.confirm(`ปิดใช้งาน "${ingredient.name}" ?`)) return
        await deactivate.mutateAsync(ingredient.id)
        toast.success('ปิดใช้งานแล้ว')
      } else {
        await update.mutateAsync({ id: ingredient.id, data: { is_active: true } })
        toast.success('เปิดใช้งานแล้ว')
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
          <h1 className="text-2xl font-semibold tracking-tight text-text">วัตถุดิบ</h1>
          <p className="text-sm text-text-muted">จัดการรายการวัตถุดิบ หน่วยนับ และอายุการเก็บ</p>
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
            แสดงที่ปิดใช้งาน
          </label>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> เพิ่มวัตถุดิบ
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">หน่วย</th>
              <th className="px-4 py-3 text-right font-medium">อายุการเก็บ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  ยังไม่มีวัตถุดิบ — กด “เพิ่มวัตถุดิบ” เพื่อเริ่ม
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                  <td className="px-4 py-3 text-text-muted">{UNIT_LABELS[r.unit]}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {r.shelf_life_days == null ? '—' : `${r.shelf_life_days} วัน`}
                  </td>
                  <td className="px-4 py-3">
                    {r.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openEdit(r)
                        }}
                        aria-label={`แก้ไข ${r.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void toggleActive(r)
                        }}
                        aria-label={
                          r.is_active ? `ปิดใช้งาน ${r.name}` : `เปิดใช้งาน ${r.name}`
                        }
                      >
                        {r.is_active ? (
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

      <IngredientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={(v) => {
          void handleSubmit(v)
        }}
        isPending={create.isPending || update.isPending}
      />
    </div>
  )
}
