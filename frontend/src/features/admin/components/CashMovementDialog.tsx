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
import type { CashMovementInput } from '@/features/admin/api/cashDrawer'
import { CASH_MOVEMENT_LABELS } from '@/types/cash'

const schema = z.object({
  type: z.enum(['pay_in', 'pay_out']),
  amount: z.number().positive('จำนวนต้องมากกว่า 0'),
  reason: z.string().max(255).nullable(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CashMovementInput) => void
  isPending?: boolean
}

const SELECT =
  'h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function CashMovementDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CashMovementInput>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'pay_in', amount: 0, reason: null },
  })

  useEffect(() => {
    if (open) reset({ type: 'pay_in', amount: 0, reason: null })
  }, [open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกเงินเข้า / ออก</DialogTitle>
            <DialogDescription>บันทึกการนำเงินเข้าหรือออกจากลิ้นชักของกะที่เปิดอยู่</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((v) => {
              onSubmit(v)
            })}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="cash-type">ประเภท</Label>
              <select id="cash-type" className={SELECT} {...register('type')}>
                {(['pay_in', 'pay_out'] as const).map((t) => (
                  <option key={t} value={t}>
                    {CASH_MOVEMENT_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-amount">จำนวนเงิน (บาท)</Label>
              <Input
                id="cash-amount"
                type="number"
                step="0.01"
                min={0}
                autoFocus
                className="h-10"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p role="alert" className="text-xs text-[var(--color-danger)]">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-reason">เหตุผล (ไม่บังคับ)</Label>
              <Input
                id="cash-reason"
                placeholder="เช่น จ่ายค่าวัตถุดิบ"
                className="h-10"
                {...register('reason', { setValueAs: (v: string) => (v === '' ? null : v) })}
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
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
