import { m, useReducedMotion } from 'framer-motion'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginHero } from '@/features/auth/components/LoginHero'
import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'
import { duration, ease } from '@/lib/motion'

export function LoginPage() {
  const reduced = useReducedMotion() ?? false

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Brand hero: top on tablet portrait, left on desktop. */}
      <LoginHero />

      {/* Sign-in panel. */}
      <div className="flex flex-1 items-center justify-center bg-bg p-6 sm:p-10">
        <m.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={reduced ? false : { opacity: 1, y: 0 }}
          transition={{ duration: duration.base, ease: ease.out }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 shadow-sm">
              <LoginHeroFallback className="h-8 w-8" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight text-text">SmartBrew POS</p>
              <p className="text-xs text-text-muted">ระบบขายหน้าร้าน</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-text-muted">กรอกบัญชีพนักงานเพื่อเริ่มกะการขาย</p>

          <div className="mt-7">
            <LoginForm />
          </div>
        </m.div>
      </div>
    </div>
  )
}
