import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="dashboard-from">จาก</Label>
        <Input
          id="dashboard-from"
          type="date"
          value={from}
          max={to}
          onChange={(e) => {
            onChange({ from: e.target.value, to })
          }}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dashboard-to">ถึง</Label>
        <Input
          id="dashboard-to"
          type="date"
          value={to}
          min={from}
          onChange={(e) => {
            onChange({ from, to: e.target.value })
          }}
          className="w-40"
        />
      </div>
    </div>
  )
}
