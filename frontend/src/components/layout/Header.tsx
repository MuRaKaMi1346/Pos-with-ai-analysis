import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { logoutRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/stores/authStore'

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
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">SmartBrew POS</span>
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
