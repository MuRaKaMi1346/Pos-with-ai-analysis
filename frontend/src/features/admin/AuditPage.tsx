import { Search } from 'lucide-react'
import { useState } from 'react'

import { useAuditLogs } from '@/features/admin/api/audit'

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' })
}

export function AuditPage() {
  const [entityType, setEntityType] = useState('')
  const { data, isPending } = useAuditLogs({ entityType: entityType.trim() || undefined })
  const rows = data ?? []

  return (
    <div className="space-y-5 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">บันทึกการใช้งาน</h1>
          <p className="text-sm text-text-muted">ประวัติการเปลี่ยนแปลงในระบบ (ล่าสุดก่อน)</p>
        </div>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <input
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value)
            }}
            placeholder="กรองตามประเภท เช่น order, product"
            aria-label="กรองตามประเภท entity"
            className="h-10 w-72 rounded-md border border-border bg-input pl-10 pr-3 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
              <th className="px-4 py-3 font-medium">เวลา</th>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">การกระทำ</th>
              <th className="px-4 py-3 font-medium">รายการ</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  กำลังโหลด…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  ไม่มีบันทึก
                </td>
              </tr>
            ) : (
              rows.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-text-muted">
                    {fmtTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">
                    {log.user_id == null ? 'ระบบ' : `#${log.user_id}`}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{log.action}</code>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {log.entity_type} #{log.entity_id}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{log.ip_address ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
