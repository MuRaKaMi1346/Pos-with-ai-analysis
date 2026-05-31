import { Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useOpenShift } from '@/features/shifts/api/shifts'

/** Opening-float entry → opens a till session (spec §5.11). */
export function OpenShiftForm({ onOpened }: { onOpened: () => void }) {
  const [float, setFloat] = useState('')
  const openShift = useOpenShift()

  async function submit(): Promise<void> {
    const amount = Number(float)
    if (float === '' || !Number.isFinite(amount) || amount < 0) return
    try {
      await openShift.mutateAsync(amount)
      onOpened()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'เปิดกะไม่สำเร็จ')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Wallet className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-stone-900">เปิดกะการขาย</h1>
        <p className="text-sm text-stone-500">ใส่จำนวนเงินทอนตั้งต้นในลิ้นชักเพื่อเริ่มกะ</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-stone-600">เงินตั้งต้น (บาท)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={float}
          onChange={(e) => {
            setFloat(e.target.value)
          }}
          aria-label="เงินตั้งต้น"
          className="h-11 rounded-lg border border-stone-300 px-3 text-right text-lg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </label>
      <Button
        size="lg"
        className="h-12"
        disabled={float === '' || openShift.isPending}
        onClick={submit}
      >
        {openShift.isPending ? 'กำลังเปิดกะ…' : 'เปิดกะ'}
      </Button>
    </div>
  )
}
