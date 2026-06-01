import { m, useReducedMotion } from 'framer-motion'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'
import { duration, ease } from '@/lib/motion'

/**
 * Dark, monochrome sign-in: a single frosted card centered on a near-black
 * field with a soft white glow behind it. No side panel, no colour, no
 * parallax — just depth from elevation + blur. All motion reduced-motion gated.
 */
export function LoginPage() {
  const reduced = useReducedMotion() ?? false

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[oklch(0.15_0_0)] px-4 py-10 text-white">
      {/* Soft top glow — gently breathes for a touch of life. */}
      <m.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, oklch(1 0 0 / 0.08), transparent 65%)' }}
        animate={reduced ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Faint grid texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(circle at 50% 40%, black, transparent 75%)',
        }}
      />
      {/* Bottom vignette for grounding. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, transparent 55%, oklch(0 0 0 / 0.55))' }}
      />

      <m.div
        initial={reduced ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={reduced ? false : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: duration.long, ease: ease.out }}
        className="relative w-full max-w-md"
      >
        <div
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_90px_-24px_oklch(0_0_0/0.85)]
                     ring-1 ring-inset ring-white/5 backdrop-blur-xl sm:p-10"
        >
          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b from-white/15 to-white/[0.03] text-white shadow-lg">
              <LoginHeroFallback className="h-9 w-9" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
              ยินดีต้อนรับกลับมา
            </h1>
            <p className="mt-1.5 text-sm text-white/50">เข้าสู่ระบบ SmartBrew POS เพื่อเริ่มกะการขาย</p>
          </div>

          {/* Form */}
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/35">
          SmartBrew POS · ระบบขายหน้าร้านสำหรับคาเฟ่
        </p>
      </m.div>
    </div>
  )
}
