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
import type { IngredientInput } from '@/features/admin/api/ingredients'
import { UNITS, UNIT_LABELS, type Ingredient } from '@/types/ingredient'

const schema = z.object({
  name: z.string().min(1, 'จำเป็นต้องใส่ชื่อ').max(120),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'piece', 'shot', 'pump', 'pack']),
  shelf_life_days: z.number().int().min(0).nullable(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit mode; absent → create mode. */
  initial?: Ingredient
  onSubmit: (values: IngredientInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'

export function IngredientDialog({ open, onOpenChange, initial, onSubmit, isPending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IngredientInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', unit: 'g', shelf_life_days: null },
  })

  // Reset the form whenever the dialog opens (fresh for create, prefilled for edit).
  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        unit: initial?.unit ?? 'g',
        shelf_life_days: initial?.shelf_life_days ?? null,
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{initial ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}</DialogTitle>
            <DialogDescription>กำหนดชื่อ หน่วยนับ และอายุการเก็บรักษา</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="ing-name">ชื่อวัตถุดิบ</Label>
              <Input id="ing-name" autoFocus className={FIELD} {...register('name')} />
              {errors.name && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ing-unit">หน่วยนับ</Label>
              <select
                id="ing-unit"
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register('unit')}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ing-shelf">อายุการเก็บ (วัน)</Label>
              <Input
                id="ing-shelf"
                type="number"
                min={0}
                placeholder="ไม่ระบุ"
                className={FIELD}
                {...register('shelf_life_days', {
                  // Guard null/undefined too — Number(null) is 0, which would
                  // wrongly persist "0 days" for an untouched field.
                  setValueAs: (v: unknown) =>
                    v === '' || v === null || v === undefined ? null : Number(v),
                })}
              />
              {errors.shelf_life_days && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  ต้องเป็นจำนวนวันที่ไม่ติดลบ
                </p>
              )}
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
                {initial ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
