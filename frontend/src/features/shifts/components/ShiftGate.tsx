import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentShift } from '@/features/shifts/api/shifts'

/** Route guard for the POS: no open shift → send the cashier to /shift (§5.11).
 * Fails open on a lookup error so a flaky shifts call can't lock out the POS. */
export function ShiftGate() {
  const { data: shift, isPending } = useCurrentShift()
  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-500">
        กำลังตรวจสอบกะ…
      </div>
    )
  }
  if (shift === null) {
    return <Navigate to="/shift" replace />
  }
  return <Outlet />
}
