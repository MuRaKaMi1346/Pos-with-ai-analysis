import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type ModifierGroupCreateInput,
  useCreateModifierGroup,
  useDeleteModifierGroup,
  useModifierGroups,
  useUpdateModifierGroup,
} from '@/features/admin/api/modifierGroups'
import { ModifierGroupDialog } from '@/features/admin/components/ModifierGroupDialog'
import type { ModifierGroup } from '@/types/modifier'

export function ModifierGroupsPage() {
  const { data, isPending } = useModifierGroups()
  const create = useCreateModifierGroup()
  const update = useUpdateModifierGroup()
  const remove = useDeleteModifierGroup()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ModifierGroup | undefined>(undefined)

  async function handleSubmit(values: ModifierGroupCreateInput): Promise<void> {
    try {
      if (editing) {
        const { name, min_select, max_select, is_required } = values
        await update.mutateAsync({ id: editing.id, data: { name, min_select, max_select, is_required } })
        toast.success('บันทึกกลุ่มตัวเลือกแล้ว')
      } else {
        await create.mutateAsync(values)
        toast.success('เพิ่มกลุ่มตัวเลือกแล้ว')
      }
      setDialogOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function handleDelete(g: ModifierGroup): Promise<void> {
    if (!window.confirm(`ลบกลุ่ม "${g.name}"?`)) return
    try {
      await remove.mutateAsync(g.id)
      toast.success('ลบแล้ว')
    } catch {
      toast.error('ลบไม่สำเร็จ (อาจมีเมนูใช้งานอยู่)')
    }
  }

  const rows = data ?? []

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">กลุ่มตัวเลือก</h1>
          <p className="text-sm text-text-muted">จัดการตัวเลือกของเมนู เช่น ความหวาน ท็อปปิ้ง</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" /> เพิ่มกลุ่ม
        </Button>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">ชื่อกลุ่ม</th>
              <th className="px-4 py-3 font-medium">ตัวเลือก</th>
              <th className="px-4 py-3 font-medium">เลือกได้</th>
              <th className="px-4 py-3 font-medium">จำเป็น</th>
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
                  ยังไม่มีกลุ่มตัวเลือก — กด “เพิ่มกลุ่ม” เพื่อเริ่ม
                </td>
              </tr>
            ) : (
              rows.map((g) => (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{g.name}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {g.modifiers.length === 0
                      ? '—'
                      : `${g.modifiers.length} ตัวเลือก · ${g.modifiers
                          .map((m) => m.name)
                          .slice(0, 3)
                          .join(', ')}${g.modifiers.length > 3 ? '…' : ''}`}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">
                    {g.min_select}–{g.max_select}
                  </td>
                  <td className="px-4 py-3">
                    {g.is_required ? (
                      <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        จำเป็น
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">ไม่บังคับ</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(g)
                          setDialogOpen(true)
                        }}
                        aria-label={`แก้ไข ${g.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void handleDelete(g)
                        }}
                        aria-label={`ลบ ${g.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModifierGroupDialog
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
