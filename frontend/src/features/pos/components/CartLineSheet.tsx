import { Minus, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { lineUnitPrice, useCartStore, type TicketLine } from '@/features/pos/stores/cartStore'
import { formatCurrency } from '@/lib/utils'

interface CartLineSheetProps {
  line: TicketLine | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditOptions: (line: TicketLine) => void
}

/** Right-side editor for one ticket line: qty, note, options, remove (spec §5.4). */
export function CartLineSheet({ line, open, onOpenChange, onEditOptions }: CartLineSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open && line && (
        <CartLineSheetBody
          line={line}
          onEditOptions={onEditOptions}
          onClose={() => {
            onOpenChange(false)
          }}
        />
      )}
    </Sheet>
  )
}

interface BodyProps {
  line: TicketLine
  onEditOptions: (line: TicketLine) => void
  onClose: () => void
}

function CartLineSheetBody({ line, onEditOptions, onClose }: BodyProps) {
  const incLine = useCartStore((s) => s.incLine)
  const decLine = useCartStore((s) => s.decLine)
  const updateLine = useCartStore((s) => s.updateLine)
  const removeLine = useCartStore((s) => s.removeLine)

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{line.product.name}</SheetTitle>
        {line.modifiers.length > 0 && (
          <p className="text-sm text-stone-500">{line.modifiers.map((m) => m.name).join(', ')}</p>
        )}
      </SheetHeader>

      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-500">จำนวน</span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            aria-label="ลดจำนวน"
            onClick={() => {
              decLine(line.uid)
            }}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <span className="w-8 text-center text-xl font-semibold tabular-nums">{line.qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            aria-label="เพิ่มจำนวน"
            onClick={() => {
              incLine(line.uid)
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {line.product.has_modifiers && (
        <Button
          variant="outline"
          onClick={() => {
            onEditOptions(line)
          }}
        >
          แก้ตัวเลือก
        </Button>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="line-note" className="text-xs font-medium text-stone-500">
          หมายเหตุ
        </label>
        <textarea
          id="line-note"
          defaultValue={line.note ?? ''}
          maxLength={255}
          rows={2}
          placeholder="เช่น ไม่ใส่น้ำแข็ง"
          onChange={(e) => {
            updateLine(line.uid, { modifiers: line.modifiers, note: e.target.value })
          }}
          className="w-full rounded-lg border border-stone-300 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">ราคา/หน่วย</span>
        <span className="font-semibold tabular-nums">{formatCurrency(lineUnitPrice(line))}</span>
      </div>

      <SheetFooter>
        <Button
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => {
            removeLine(line.uid)
            onClose()
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> ลบรายการ
        </Button>
      </SheetFooter>
    </SheetContent>
  )
}
