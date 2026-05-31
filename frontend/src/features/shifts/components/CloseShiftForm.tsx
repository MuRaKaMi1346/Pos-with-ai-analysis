import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useCloseShift } from '@/features/shifts/api/shifts'
import { formatCurrency } from '@/lib/utils'
import type { Shift } from '@/types/shift'

/** Count-cash form → closes the open shift; result drives the variance summary. */
export function CloseShiftForm({
  shift,
  onClosed,
}: {
  shift: Shift
  onClosed: (closed: Shift) => void
}) {
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const closeShift = useCloseShift()

  async function submit(): Promise<void> {
    const amount = Number(counted)
    if (counted === '' || !Number.isFinite(amount) || amount < 0) return
    try {
      const closed = await closeShift.mutateAsync({
        closing_cash_counted: amount,
        closing_note: note.trim() || null,
      })
      onClosed(closed)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'ปิดกะไม่สำเร็จ')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-stone-900">ปิดกะการขาย</h1>
        <p className="text-sm text-stone-500">นับเงินสดในลิ้นชักแล้วกรอกจำนวนที่นับได้</p>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-stone-100 px-3 py-2 text-sm">
        <span className="text-stone-500">เงินตั้งต้น</span>
        <span className="font-semibold tabular-nums">{formatCurrency(shift.opening_float)}</span>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-600">เงินสดที่นับได้ (บาท)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={counted}
          onChange={(e) => {
            setCounted(e.target.value)
          }}
          aria-label="เงินสดที่นับได้"
          className="h-11 rounded-lg border border-stone-300 px-3 text-right text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-600">หมายเหตุ (ไม่บังคับ)</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
          }}
          rows={2}
          maxLength={255}
          aria-label="หมายเหตุปิดกะ"
          className="rounded-lg border border-stone-300 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </label>
      <Button
        size="lg"
        className="h-12"
        disabled={counted === '' || closeShift.isPending}
        onClick={submit}
      >
        {closeShift.isPending ? 'กำลังปิดกะ…' : 'ปิดกะ'}
      </Button>
    </div>
  )
}
