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
import type { ApplyDiscountInput } from '@/features/admin/api/orders'

const schema = z
  .object({
    name: z.string().min(1, 'จำเป็นต้องใส่ชื่อ').max(120),
    type: z.enum(['percent', 'amount']),
    value: z.number().gt(0, 'มากกว่า 0'),
    reason: z.string().min(1, 'ระบุเหตุผล').max(255),
  })
  .refine((d) => !(d.type === 'percent' && d.value > 1), {
    message: 'เปอร์เซ็นต์ต้อง ≤ 1 (เช่น 0.1 = 10%)',
    path: ['value'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ApplyDiscountInput) => void
  isPending?: boolean
}

const FIELD = 'h-10'
const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function OrderDiscountDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'percent', value: 0, reason: '' },
  })

  useEffect(() => {
    if (open) reset({ name: '', type: 'percent', value: 0, reason: '' })
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลดราคาทั้งบิล</DialogTitle>
            <DialogDescription>ส่วนลดเฉพาะกิจ — เปอร์เซ็นต์ใส่ทศนิยม เช่น 0.1 = 10%</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="od-name">ชื่อส่วนลด</Label>
              <Input id="od-name" autoFocus className={FIELD} {...register('name')} />
              {errors.name && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="od-type">ประเภท</Label>
                <select id="od-type" className={SELECT} {...register('type')}>
                  <option value="percent">เปอร์เซ็นต์</option>
                  <option value="amount">จำนวนเงิน</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="od-value">มูลค่า</Label>
                <Input
                  id="od-value"
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="od-reason">เหตุผล</Label>
              <Input id="od-reason" className={FIELD} {...register('reason')} />
              {errors.reason && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.reason.message}
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
                ใช้ส่วนลด
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
