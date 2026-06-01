import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useProductModifiers } from '@/features/pos/api/products'
import { ModifierPicker } from '@/features/pos/components/ModifierPicker'
import {
  canConfirmSelection,
  selectedModifiers,
  toggleModifier,
} from '@/features/pos/lib/modifierSelection'
import type { SelectedModifier } from '@/features/pos/stores/cartStore'
import { formatCurrency } from '@/lib/utils'
import type { ModifierGroup } from '@/types/modifier'
import type { Product } from '@/types/product'

interface ModifierDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill when editing an existing cart line. */
  initial?: { modifiers: SelectedModifier[]; note?: string }
  confirmLabel?: string
  onConfirm: (modifiers: SelectedModifier[], note: string | undefined) => void
}

/** Modifier picker dialog. Mounts a fresh body per open so selection state resets. */
export function ModifierDialog({
  product,
  open,
  onOpenChange,
  initial,
  confirmLabel,
  onConfirm,
}: ModifierDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && product && (
        <ModifierDialogBody
          product={product}
          initial={initial}
          confirmLabel={confirmLabel}
          onConfirm={(mods, note) => {
            onConfirm(mods, note)
            onOpenChange(false)
          }}
        />
      )}
    </Dialog>
  )
}

interface BodyProps {
  product: Product
  initial?: { modifiers: SelectedModifier[]; note?: string }
  confirmLabel?: string
  onConfirm: (modifiers: SelectedModifier[], note: string | undefined) => void
}

function ModifierDialogBody({ product, initial, confirmLabel, onConfirm }: BodyProps) {
  const { data, isPending, isError } = useProductModifiers(product.id)
  const groups: ModifierGroup[] = data ?? []
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    (initial?.modifiers ?? []).map((m) => m.modifier_id),
  )
  const [note, setNote] = useState(initial?.note ?? '')

  const chosen = selectedModifiers(groups, selectedIds)
  const runningPrice = Number(product.price) + chosen.reduce((sum, m) => sum + m.price_delta, 0)
  const canConfirm = !isPending && !isError && canConfirmSelection(groups, selectedIds)

  return (
    <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-hidden">
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription className="sr-only">เลือกตัวเลือกสำหรับเมนูนี้</DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isPending ? (
          <p className="py-8 text-center text-sm text-text-muted">กำลังโหลดตัวเลือก…</p>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-600">โหลดตัวเลือกไม่สำเร็จ</p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">เมนูนี้ไม่มีตัวเลือกเพิ่มเติม</p>
        ) : (
          <ModifierPicker
            groups={groups}
            selectedIds={selectedIds}
            onToggle={(group, modifierId) => {
              setSelectedIds((prev) => toggleModifier(group, prev, modifierId))
            }}
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="modifier-note" className="text-xs font-medium text-text-muted">
          หมายเหตุ
        </label>
        <input
          id="modifier-note"
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
          }}
          maxLength={255}
          placeholder="เช่น ไม่ใส่น้ำแข็ง"
          className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <DialogFooter className="sm:items-center sm:justify-between">
        <span className="text-lg font-semibold tabular-nums text-text">
          {formatCurrency(runningPrice)}
        </span>
        <Button
          disabled={!canConfirm}
          onClick={() => {
            onConfirm(chosen, note.trim() || undefined)
          }}
        >
          {confirmLabel ?? 'เพิ่มลงตะกร้า'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
