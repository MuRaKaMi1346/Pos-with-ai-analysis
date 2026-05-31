import { m, useReducedMotion } from 'framer-motion'
import { lazy, Suspense } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'
import { spring } from '@/lib/motion'

// Lazy so three.js ships in its own chunk and never touches the main bundle.
const LoginHero3D = lazy(() => import('@/features/auth/components/LoginHero3D'))

export function LoginPage() {
  const reduced = useReducedMotion() ?? false

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Hero: left on desktop, top on tablet portrait. */}
      <div className="relative flex min-h-[38vh] flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-[#3a2a1c] to-[#7c5a3e] md:min-h-screen">
        {reduced ? (
          <LoginHeroFallback className="h-44 w-44" />
        ) : (
          <Suspense fallback={<LoginHeroFallback className="h-44 w-44 animate-pulse" />}>
            <LoginHero3D />
          </Suspense>
        )}
        <div className="pointer-events-none absolute bottom-8 left-8 text-primary-fg">
          <p className="text-2xl font-bold">SmartBrew POS</p>
          <p className="text-sm opacity-80">ระบบขายหน้าร้านสำหรับคาเฟ่</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-bg p-4">
        <m.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={reduced ? false : { opacity: 1, y: 0 }}
          transition={spring.snappy}
          className="w-full max-w-sm"
        >
          <Card>
            <CardHeader>
              <CardTitle>SmartBrew POS</CardTitle>
              <CardDescription>เข้าสู่ระบบเพื่อเริ่มขาย</CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </m.div>
      </div>
    </div>
  )
}
