import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type DiscountCreateInput,
  useCreateDiscount,
  useDeactivateDiscount,
  useDiscounts,
  useUpdateDiscount,
} from '@/features/admin/api/discounts'
import { DiscountDialog } from '@/features/admin/components/DiscountDialog'
import { formatCurrency } from '@/lib/utils'
import { SCOPE_LABELS, TYPE_LABELS, type Discount } from '@/types/discount'

function formatValue(d: Discount): string {
  if (d.type === 'percent') return `${(Number(d.value) * 100).toLocaleString('th-TH')}%`
  return formatCurrency(d.value)
}

export function DiscountsPage() {
  const [showInactive, setShowInactive] = useState(true)
  const { data, isPending } = useDiscounts(!showInactive)
  const create = useCreateDiscount()
  const update = useUpdateDiscount()
  const deactivate = useDeactivateDiscount()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Discount | undefined>(undefined)

  async function handleSubmit(values: DiscountCreateInput): Promise<void> {
    try {
      if (editing) {
        const { code, name, value, min_order_amount, max_discount_amount, requires_admin } = values
        await update.mutateAsync({
          id: editing.id,
          data: { code, name, value, min_order_amount, max_discount_amount, requires_admin },
        })
        toast.success('บันทึกส่วนลดแล้ว')
      } else {
        await create.mutateAsync(values)
        toast.success('เพิ่มส่วนลดแล้ว')
      }
      setDialogOpen(false)
    } catch {
      toast.error('บันทึกไม่สำเร็จ')
    }
  }

  async function toggleActive(d: Discount): Promise<void> {
    try {
      if (d.is_active) {
        if (!window.confirm(`ปิดใช้งานส่วนลด "${d.name}"?`)) return
        await deactivate.mutateAsync(d.id)
        toast.success('ปิดใช้งานแล้ว')
      } else {
        await update.mutateAsync({ id: d.id, data: { is_active: true } })
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
          <h1 className="text-2xl font-semibold tracking-tight text-text">ส่วนลด</h1>
          <p className="text-sm text-text-muted">จัดการรายการส่วนลดที่ใช้ได้ในการขาย</p>
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
          <Button
            onClick={() => {
              setEditing(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> เพิ่มส่วนลด
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">ชื่อ</th>
              <th className="px-4 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">ขอบเขต</th>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 text-right font-medium">มูลค่า</th>
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
                  ยังไม่มีส่วนลด — กด “เพิ่มส่วนลด” เพื่อเริ่ม
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">
                    {d.name}
                    {d.requires_admin && (
                      <span className="ml-2 rounded bg-[var(--color-warning)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                        ต้องอนุมัติ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{d.code ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{SCOPE_LABELS[d.scope]}</td>
                  <td className="px-4 py-3 text-text-muted">{TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text">{formatValue(d)}</td>
                  <td className="px-4 py-3">
                    {d.is_active ? (
                      <span className="inline-flex rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
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
                          setEditing(d)
                          setDialogOpen(true)
                        }}
                        aria-label={`แก้ไข ${d.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void toggleActive(d)
                        }}
                        aria-label={d.is_active ? `ปิดใช้งาน ${d.name}` : `เปิดใช้งาน ${d.name}`}
                      >
                        {d.is_active ? (
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

      <DiscountDialog
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
