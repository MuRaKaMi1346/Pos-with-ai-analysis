import { Outlet } from 'react-router-dom'

import { Header } from '@/components/layout/Header'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
