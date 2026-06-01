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
import type { DiscountCreateInput } from '@/features/admin/api/discounts'
import { SCOPE_LABELS, TYPE_LABELS, type Discount } from '@/types/discount'

const schema = z
  .object({
    code: z.string().max(50).nullable(),
    name: z.string().min(1, 'จำเป็นต้องใส่ชื่อ').max(120),
    scope: z.enum(['order', 'item']),
    type: z.enum(['percent', 'amount', 'points']),
    value: z.number().min(0, 'ต้องไม่ติดลบ'),
    min_order_amount: z.number().min(0).nullable(),
    max_discount_amount: z.number().min(0).nullable(),
    requires_admin: z.boolean(),
  })
  .refine((d) => !(d.type === 'percent' && d.value > 1), {
    message: 'เปอร์เซ็นต์ต้อง ≤ 1 (เช่น 0.1 = 10%)',
    path: ['value'],
  })

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Discount
  onSubmit: (values: DiscountCreateInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60'
// Guard null/undefined — Number(null) is 0, which would persist a bogus 0.
const optNum = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

export function DiscountDialog({ open, onOpenChange, initial, onSubmit, isPending }: Props) {
  const editing = initial !== undefined
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: null,
      name: '',
      scope: 'order',
      type: 'percent',
      value: 0,
      min_order_amount: null,
      max_discount_amount: null,
      requires_admin: false,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: initial?.code ?? null,
        name: initial?.name ?? '',
        scope: initial?.scope ?? 'order',
        type: initial?.type ?? 'percent',
        value: initial ? Number(initial.value) : 0,
        min_order_amount: initial?.min_order_amount ? Number(initial.min_order_amount) : null,
        max_discount_amount: initial?.max_discount_amount
          ? Number(initial.max_discount_amount)
          : null,
        requires_admin: initial?.requires_admin ?? false,
      })
    }
  }, [open, initial, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขส่วนลด' : 'เพิ่มส่วนลด'}</DialogTitle>
            <DialogDescription>
              เปอร์เซ็นต์ใส่เป็นทศนิยม เช่น 0.1 = 10% · จำนวนเงิน/แต้ม ใส่เป็นบาท
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="disc-name">ชื่อ</Label>
                <Input id="disc-name" autoFocus className={FIELD} {...register('name')} />
                {errors.name && (
                  <p role="alert" className="text-xs text-[var(--color-danger)]">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="disc-code">รหัส (ไม่บังคับ)</Label>
                <Input
                  id="disc-code"
                  className={FIELD}
                  {...register('code', { setValueAs: (v: string) => (v === '' ? null : v) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="disc-scope">ขอบเขต</Label>
                <select id="disc-scope" className={SELECT} disabled={editing} {...register('scope')}>
                  {(['order', 'item'] as const).map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disc-type">ประเภท</Label>
                <select id="disc-type" className={SELECT} disabled={editing} {...register('type')}>
                  {(['percent', 'amount', 'points'] as const).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disc-value">มูลค่า</Label>
              <Input
                id="disc-value"
                type="number"
                step="0.0001"
                min={0}
                className={FIELD}
                {...register('value', { valueAsNumber: true })}
              />
              {errors.value && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.value.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="disc-min">ยอดขั้นต่ำ (ไม่บังคับ)</Label>
                <Input
                  id="disc-min"
                  type="number"
                  step="0.01"
                  min={0}
                  className={FIELD}
                  {...register('min_order_amount', { setValueAs: optNum })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disc-max">ลดสูงสุด (ไม่บังคับ)</Label>
                <Input
                  id="disc-max"
                  type="number"
                  step="0.01"
                  min={0}
                  className={FIELD}
                  {...register('max_discount_amount', { setValueAs: optNum })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                {...register('requires_admin')}
              />
              ต้องให้แอดมินอนุมัติเมื่อใช้
            </label>

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
