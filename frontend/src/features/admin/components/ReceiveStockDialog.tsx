import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReceiveStockInput } from '@/features/admin/api/inventory'
import { UNIT_LABELS, type Ingredient } from '@/types/ingredient'

const schema = z.object({
  ingredient_id: z.number().int().positive('เลือกวัตถุดิบ'),
  qty: z.number().positive('จำนวนต้องมากกว่า 0'),
  ref: z.string().max(120).nullable(),
  note: z.string().max(255).nullable(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredients: Ingredient[]
  onSubmit: (values: ReceiveStockInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function ReceiveStockDialog({
  open,
  onOpenChange,
  ingredients,
  onSubmit,
  isPending,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiveStockInput>({
    resolver: zodResolver(schema),
    defaultValues: { ingredient_id: ingredients[0]?.id ?? 0, qty: 0, ref: null, note: null },
  })

  useEffect(() => {
    if (open) reset({ ingredient_id: ingredients[0]?.id ?? 0, qty: 0, ref: null, note: null })
  }, [open, ingredients, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รับเข้าสต็อก</DialogTitle>
            <DialogDescription>เพิ่มจำนวนวัตถุดิบเข้าคลัง (บันทึกเป็นรายการรับเข้า)</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="recv-ing">วัตถุดิบ</Label>
              <select
                id="recv-ing"
                className={SELECT}
                {...register('ingredient_id', { valueAsNumber: true })}
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({UNIT_LABELS[ing.unit]})
                  </option>
                ))}
              </select>
              {errors.ingredient_id && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.ingredient_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recv-qty">จำนวน</Label>
              <Input
                id="recv-qty"
                type="number"
                step="0.0001"
                min={0}
                autoFocus
                className={FIELD}
                {...register('qty', { valueAsNumber: true })}
              />
              {errors.qty && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.qty.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recv-ref">อ้างอิง (ไม่บังคับ)</Label>
              <Input
                id="recv-ref"
                placeholder="เช่น เลขที่ใบส่งของ"
                className={FIELD}
                {...register('ref', { setValueAs: (v: string) => (v === '' ? null : v) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recv-note">หมายเหตุ (ไม่บังคับ)</Label>
              <Input
                id="recv-note"
                className={FIELD}
                {...register('note', { setValueAs: (v: string) => (v === '' ? null : v) })}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                รับเข้า
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
