import { LazyMotion, domAnimation } from 'framer-motion'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'

import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { getMe, refresh } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/stores/authStore'

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      กำลังเตรียมระบบ…
    </div>
  )
}

/**
 * Bootstrap: try /auth/refresh once on mount.
 * - If the user has a valid refresh cookie, restore the session silently.
 * - Otherwise proceed unauthenticated — ProtectedRoute will bounce to /login.
 */
function App() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    let cancelled = false
    async function bootstrap(): Promise<void> {
      try {
        const token = await refresh()
        if (cancelled) return
        setAccessToken(token)
        const user = await getMe(token)
        if (cancelled) return
        setUser(user)
      } catch {
        // unauthenticated — fine
      } finally {
        if (!cancelled) setBootstrapped(true)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [setAccessToken, setUser])

  if (!bootstrapped) return <FullScreenSpinner />

  return (
    <Providers>
      <LazyMotion features={domAnimation} strict>
        <RouterProvider router={router} />
      </LazyMotion>
    </Providers>
  )
}

export default App
