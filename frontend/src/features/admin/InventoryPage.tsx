import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useIngredients } from '@/features/admin/api/ingredients'
import {
  type ReceiveStockInput,
  useReceiveStock,
  useStockLevels,
  useStockMovements,
} from '@/features/admin/api/inventory'
import { ReceiveStockDialog } from '@/features/admin/components/ReceiveStockDialog'
import { UNIT_LABELS, type Ingredient } from '@/types/ingredient'
import { MOVEMENT_LABELS, type MovementType } from '@/types/inventory'

function fmtQty(s: string): string {
  const n = Number(s)
  return Number.isFinite(n) ? n.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : s
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export function InventoryPage() {
  const stock = useStockLevels()
  const ingredients = useIngredients(false)
  const movements = useStockMovements({ limit: 50 })
  const receive = useReceiveStock()
  const [receiveOpen, setReceiveOpen] = useState(false)

  const ingById = useMemo(() => {
    const map = new Map<number, Ingredient>()
    for (const ing of ingredients.data ?? []) map.set(ing.id, ing)
    return map
  }, [ingredients.data])

  const activeIngredients = useMemo(
    () => (ingredients.data ?? []).filter((i) => i.is_active),
    [ingredients.data],
  )

  async function handleReceive(values: ReceiveStockInput): Promise<void> {
    try {
      await receive.mutateAsync(values)
      toast.success('รับเข้าสต็อกแล้ว')
      setReceiveOpen(false)
    } catch {
      toast.error('รับเข้าไม่สำเร็จ')
    }
  }

  function ingredientLabel(id: number): string {
    const ing = ingById.get(id)
    return ing ? ing.name : `#${id}`
  }
  function unitLabel(id: number): string {
    const ing = ingById.get(id)
    return ing ? UNIT_LABELS[ing.unit] : ''
  }

  const rows = stock.data ?? []
  const moves = movements.data ?? []

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">คลังสต็อก</h1>
          <p className="text-sm text-text-muted">ยอดคงเหลือวัตถุดิบ การรับเข้า และความเคลื่อนไหว</p>
        </div>
        <Button
          onClick={() => {
            setReceiveOpen(true)
          }}
          disabled={activeIngredients.length === 0}
        >
          <Plus className="h-4 w-4" /> รับเข้าสต็อก
        </Button>
      </header>

      {/* Stock levels */}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">วัตถุดิบ</th>
              <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
              <th className="px-4 py-3 text-right font-medium">จุดสั่งซื้อ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {stock.isPending ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                  ยังไม่มีสต็อก — กด “รับเข้าสต็อก” เพื่อเริ่ม
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const low =
                  r.reorder_point != null && Number(r.quantity) <= Number(r.reorder_point)
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-text">
                      {ingredientLabel(r.ingredient_id)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text">
                      {fmtQty(r.quantity)}{' '}
                      <span className="text-xs text-text-muted">{unitLabel(r.ingredient_id)}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                      {r.reorder_point == null ? '—' : fmtQty(r.reorder_point)}
                    </td>
                    <td className="px-4 py-3">
                      {low ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-warning)]">
                          ต่ำกว่าจุดสั่งซื้อ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                          ปกติ
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Movements log */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">ความเคลื่อนไหวล่าสุด</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">วัตถุดิบ</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">อ้างอิง</th>
              </tr>
            </thead>
            <tbody>
              {movements.isPending ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                    กำลังโหลด…
                  </td>
                </tr>
              ) : moves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                    ยังไม่มีความเคลื่อนไหว
                  </td>
                </tr>
              ) : (
                moves.map((m) => {
                  const n = Number(m.qty)
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 tabular-nums text-text-muted">{fmtTime(m.created_at)}</td>
                      <td className="px-4 py-3 text-text">{ingredientLabel(m.ingredient_id)}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {MOVEMENT_LABELS[m.type as MovementType] ?? m.type}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          n < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                        }`}
                      >
                        {n > 0 ? '+' : ''}
                        {fmtQty(m.qty)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {[m.ref, m.note].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ReceiveStockDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        ingredients={activeIngredients}
        onSubmit={(v) => {
          void handleReceive(v)
        }}
        isPending={receive.isPending}
      />
    </div>
  )
}
