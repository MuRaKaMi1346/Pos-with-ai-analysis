import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import type { RecipeLineInput } from '@/features/admin/api/recipes'
import { UNITS, UNIT_LABELS, type Ingredient } from '@/types/ingredient'

const schema = z.object({
  ingredient_id: z.number().int().positive('เลือกวัตถุดิบ'),
  qty: z.number().positive('จำนวนต้องมากกว่า 0'),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'piece', 'shot', 'pump', 'pack']),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredients: Ingredient[]
  onSubmit: (values: RecipeLineInput) => void
  isPending?: boolean
}

const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function RecipeLineDialog({ open, onOpenChange, ingredients, onSubmit, isPending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<RecipeLineInput>({
    resolver: zodResolver(schema),
    defaultValues: { ingredient_id: ingredients[0]?.id ?? 0, qty: 0, unit: ingredients[0]?.unit ?? 'g' },
  })

  useEffect(() => {
    if (open) {
      reset({
        ingredient_id: ingredients[0]?.id ?? 0,
        qty: 0,
        unit: ingredients[0]?.unit ?? 'g',
      })
    }
  }, [open, ingredients, reset])

  // Default the unit to the selected ingredient's own unit when it changes.
  const ingredientId = useWatch({ control, name: 'ingredient_id' })
  useEffect(() => {
    const ing = ingredients.find((i) => i.id === ingredientId)
    if (ing) setValue('unit', ing.unit)
  }, [ingredientId, ingredients, setValue])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มวัตถุดิบในสูตร</DialogTitle>
            <DialogDescription>กำหนดปริมาณวัตถุดิบที่ใช้ต่อ 1 หน่วยของเมนูนี้</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="rec-ing">วัตถุดิบ</Label>
              <select
                id="rec-ing"
                className={SELECT}
                {...register('ingredient_id', { valueAsNumber: true })}
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
              {errors.ingredient_id && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.ingredient_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rec-qty">ปริมาณ</Label>
                <Input
                  id="rec-qty"
                  type="number"
                  step="0.0001"
                  min={0}
                  autoFocus
                  className="h-10"
                  {...register('qty', { valueAsNumber: true })}
                />
                {errors.qty && (
                  <p role="alert" className="text-xs text-[var(--color-danger)]">
                    {errors.qty.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-unit">หน่วย</Label>
                <select id="rec-unit" className={SELECT} {...register('unit')}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>
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
                เพิ่ม
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
