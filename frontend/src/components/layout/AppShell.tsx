import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { duration, ease } from '@/lib/motion'
import { useUiStore } from '@/stores/uiStore'

export function AppShell() {
  const density = useUiStore((s) => s.density)
  const location = useLocation()
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        {/* Subtle route transition: new page rises in, old fades up (§4.9). */}
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={reduced ? false : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: duration.short, ease: ease.out }}
            className="h-full"
          >
            <Outlet />
          </m.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
