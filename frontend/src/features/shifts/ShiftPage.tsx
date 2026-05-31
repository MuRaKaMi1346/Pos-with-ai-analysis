import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCurrentShift } from '@/features/shifts/api/shifts'
import { ClosedShiftSummary } from '@/features/shifts/components/ClosedShiftSummary'
import { CloseShiftForm } from '@/features/shifts/components/CloseShiftForm'
import { OpenShiftForm } from '@/features/shifts/components/OpenShiftForm'
import type { Shift } from '@/types/shift'

/** Shift open/close screen (spec §5.11). Open → close → variance summary. */
export function ShiftPage() {
  const navigate = useNavigate()
  const { data: shift, isPending } = useCurrentShift()
  const [closed, setClosed] = useState<Shift | null>(null)

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      {isPending ? (
        <p className="py-8 text-center text-sm text-stone-500">กำลังโหลด…</p>
      ) : closed ? (
        <ClosedShiftSummary
          shift={closed}
          onReset={() => {
            setClosed(null)
          }}
        />
      ) : shift ? (
        <CloseShiftForm shift={shift} onClosed={setClosed} />
      ) : (
        <OpenShiftForm
          onOpened={() => {
            navigate('/pos')
          }}
        />
      )}
    </div>
  )
}
