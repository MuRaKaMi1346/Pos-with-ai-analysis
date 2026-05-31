import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { useUiStore } from '@/stores/uiStore'

export function AppShell() {
  const density = useUiStore((s) => s.density)
  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
