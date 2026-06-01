import { BarChart3, Brain, ChefHat, Coffee, LogOut, Moon, Sun, Wallet } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import type { MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { logoutRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { animateThemeChange } from '@/lib/theme-transition'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
      : 'text-text-muted hover:bg-surface-2',
  )
}

export function Header() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  async function handleLogout(): Promise<void> {
    try {
      await logoutRequest()
    } catch {
      // best effort — clear local state regardless
    }
    clear()
    navigate('/login', { replace: true })
  }

  // Reveal the new theme as a circle expanding from the toggle button.
  function handleToggleTheme(e: MouseEvent<HTMLButtonElement>): void {
    const rect = e.currentTarget.getBoundingClientRect()
    animateThemeChange(toggleTheme, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold">SmartBrew POS</span>
        <nav className="flex items-center gap-1">
          <NavLink to="/pos" className={navLinkClass}>
            <Coffee className="h-4 w-4" /> POS
          </NavLink>
          <NavLink to="/shift" className={navLinkClass}>
            <Wallet className="h-4 w-4" /> กะ
          </NavLink>
          <NavLink to="/kds" className={navLinkClass}>
            <ChefHat className="h-4 w-4" /> KDS
          </NavLink>
          {user?.role === 'admin' && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <BarChart3 className="h-4 w-4" /> Dashboard
              </NavLink>
              <NavLink to="/ai-insights" className={navLinkClass}>
                <Brain className="h-4 w-4" /> AI
              </NavLink>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-text-muted">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
        </Button>
      </div>
    </header>
  )
}
