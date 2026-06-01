import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, X } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
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
import type { ModifierGroupCreateInput } from '@/features/admin/api/modifierGroups'
import { formatCurrency } from '@/lib/utils'
import type { ModifierGroup } from '@/types/modifier'

const schema = z
  .object({
    name: z.string().min(1, 'จำเป็นต้องใส่ชื่อ').max(100),
    min_select: z.number().int().min(0),
    max_select: z.number().int().min(1),
    is_required: z.boolean(),
    modifiers: z.array(z.object({ name: z.string().min(1, 'ใส่ชื่อ').max(100), price_delta: z.number().min(0) })),
  })
  .refine((d) => d.max_select >= d.min_select, {
    message: 'เลือกสูงสุดต้อง ≥ เลือกต่ำสุด',
    path: ['max_select'],
  })

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ModifierGroup
  onSubmit: (values: ModifierGroupCreateInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'

export function ModifierGroupDialog({ open, onOpenChange, initial, onSubmit, isPending }: Props) {
  const editing = initial !== undefined
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ModifierGroupCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      min_select: 0,
      max_select: 1,
      is_required: false,
      modifiers: [{ name: '', price_delta: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'modifiers' })

  useEffect(() => {
    if (open) {
      reset({
        name: initial?.name ?? '',
        min_select: initial?.min_select ?? 0,
        max_select: initial?.max_select ?? 1,
        is_required: initial?.is_required ?? false,
        modifiers: initial
          ? initial.modifiers.map((m) => ({ name: m.name, price_delta: Number(m.price_delta) }))
          : [{ name: '', price_delta: 0 }],
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'แก้ไขการตั้งค่ากลุ่มได้ — แก้รายการตัวเลือกไม่ได้ (ลบกลุ่มแล้วสร้างใหม่)'
                : 'เช่น “ระดับความหวาน”, “ท็อปปิ้ง” พร้อมตัวเลือกและส่วนเพิ่มราคา'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="mg-name">ชื่อกลุ่ม</Label>
              <Input id="mg-name" autoFocus className={FIELD} {...register('name')} />
              {errors.name && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mg-min">เลือกต่ำสุด</Label>
                <Input
                  id="mg-min"
                  type="number"
                  min={0}
                  className={FIELD}
                  {...register('min_select', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mg-max">เลือกสูงสุด</Label>
                <Input
                  id="mg-max"
                  type="number"
                  min={1}
                  className={FIELD}
                  {...register('max_select', { valueAsNumber: true })}
                />
                {errors.max_select && (
                  <p role="alert" className="text-xs text-[var(--color-danger)]">
                    {errors.max_select.message}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                {...register('is_required')}
              />
              บังคับให้เลือก
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ตัวเลือก</Label>
                {!editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      append({ name: '', price_delta: 0 })
                    }}
                  >
                    <Plus className="h-4 w-4" /> เพิ่มตัวเลือก
                  </Button>
                )}
              </div>

              {editing ? (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {(initial?.modifiers ?? []).map((m) => (
                    <li key={m.id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-text">{m.name}</span>
                      <span className="tabular-nums text-text-muted">
                        +{formatCurrency(m.price_delta)}
                      </span>
                    </li>
                  ))}
                  {(initial?.modifiers ?? []).length === 0 && (
                    <li className="px-3 py-2 text-sm text-text-muted">ไม่มีตัวเลือก</li>
                  )}
                </ul>
              ) : (
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={f.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="ชื่อตัวเลือก"
                          className={FIELD}
                          {...register(`modifiers.${i}.name`)}
                        />
                        {errors.modifiers?.[i]?.name && (
                          <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
                            {errors.modifiers[i]?.name?.message}
                          </p>
                        )}
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="+ราคา"
                        className={`${FIELD} w-28`}
                        {...register(`modifiers.${i}.price_delta`, { valueAsNumber: true })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          remove(i)
                        }}
                        aria-label="ลบตัวเลือก"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
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
                {editing ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
