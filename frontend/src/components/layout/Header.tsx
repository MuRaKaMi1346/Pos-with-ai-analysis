import { BarChart3, Coffee, LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { logoutRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { cn } from '@/lib/utils'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
  )
}

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  async function handleLogout(): Promise<void> {
    try {
      await logoutRequest()
    } catch {
      // best effort — clear local state regardless
    }
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold">SmartBrew POS</span>
        <nav className="flex items-center gap-1">
          <NavLink to="/pos" className={navLinkClass}>
            <Coffee className="h-4 w-4" /> POS
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/dashboard" className={navLinkClass}>
              <BarChart3 className="h-4 w-4" /> Dashboard
            </NavLink>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
        </Button>
      </div>
    </header>
  )
}
