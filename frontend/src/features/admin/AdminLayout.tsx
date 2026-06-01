import {
  BadgePercent,
  Banknote,
  Boxes,
  ListChecks,
  NotebookText,
  ScrollText,
  Undo2,
  Warehouse,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface Section {
  to: string
  label: string
  icon: ReactNode
}

/** Admin sections — extended one milestone at a time as each screen lands. */
const SECTIONS: Section[] = [
  { to: '/admin/ingredients', label: 'วัตถุดิบ', icon: <Boxes className="h-4 w-4" /> },
  { to: '/admin/recipes', label: 'สูตร (BOM)', icon: <NotebookText className="h-4 w-4" /> },
  { to: '/admin/inventory', label: 'คลังสต็อก', icon: <Warehouse className="h-4 w-4" /> },
  { to: '/admin/discounts', label: 'ส่วนลด', icon: <BadgePercent className="h-4 w-4" /> },
  { to: '/admin/modifiers', label: 'กลุ่มตัวเลือก', icon: <ListChecks className="h-4 w-4" /> },
  { to: '/admin/cash-drawer', label: 'ลิ้นชักเงินสด', icon: <Banknote className="h-4 w-4" /> },
  { to: '/admin/refunds', label: 'คืนเงิน', icon: <Undo2 className="h-4 w-4" /> },
  { to: '/admin/audit', label: 'บันทึกการใช้งาน', icon: <ScrollText className="h-4 w-4" /> },
]

/** Shell for the admin / back-office area: a section sub-nav above a scroll region. */
export function AdminLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface px-4 sm:px-6">
        <nav aria-label="ส่วนจัดการ" className="flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
                    : 'text-text-muted hover:bg-surface-2',
                )
              }
            >
              {s.icon}
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
