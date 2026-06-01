import { m, useReducedMotion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'
import { duration, ease } from '@/lib/motion'

type Theme = 'dark' | 'light'

/** Self-contained colour set per theme (login only — not the app-wide theme). */
function tokens(dark: boolean) {
  return {
    page: dark ? 'oklch(0.15 0 0)' : 'oklch(0.965 0.004 250)',
    text: dark ? 'oklch(0.99 0 0)' : 'oklch(0.2 0.02 260)',
    muted: dark ? 'oklch(0.99 0 0 / 0.5)' : 'oklch(0.45 0.02 260)',
    faint: dark ? 'oklch(0.99 0 0 / 0.35)' : 'oklch(0.55 0.02 260)',
    glow: dark ? 'oklch(1 0 0 / 0.08)' : 'oklch(0.55 0.04 260 / 0.18)',
    grid: dark ? 'oklch(1 0 0)' : 'oklch(0.2 0.02 260)',
    vignette: dark ? 'oklch(0 0 0 / 0.55)' : 'oklch(0.2 0.05 260 / 0.06)',
    card: dark ? 'oklch(1 0 0 / 0.05)' : 'oklch(1 0 0)',
    cardBorder: dark ? 'oklch(1 0 0 / 0.12)' : 'oklch(0.9 0 0)',
    // Stacked sheets behind the card (back → front).
    layer2: dark ? 'oklch(1 0 0 / 0.025)' : 'oklch(1 0 0 / 0.55)',
    layer1: dark ? 'oklch(1 0 0 / 0.04)' : 'oklch(1 0 0 / 0.8)',
    layerBorder: dark ? 'oklch(1 0 0 / 0.08)' : 'oklch(0.9 0 0)',
    badge: dark
      ? 'linear-gradient(to bottom, oklch(1 0 0 / 0.16), oklch(1 0 0 / 0.03))'
      : 'linear-gradient(to bottom, oklch(0.2 0.02 260 / 0.08), oklch(0.2 0.02 260 / 0.02))',
    badgeBorder: dark ? 'oklch(1 0 0 / 0.15)' : 'oklch(0.88 0 0)',
    cardShadow: dark
      ? '0 50px 100px -28px oklch(0 0 0 / 0.85)'
      : '0 50px 100px -32px oklch(0.4 0.05 260 / 0.4)',
    toggleBtn: dark
      ? 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  }
}

export function LoginPage() {
  const reduced = useReducedMotion() ?? false
  // Default dark; allow ?theme=light to preset (handy for deep links / preview).
  const [theme, setTheme] = useState<Theme>(() =>
    new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark',
  )
  const dark = theme === 'dark'
  const t = tokens(dark)

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 transition-colors duration-300"
      style={{ background: t.page, color: t.text }}
    >
      {/* Theme toggle. */}
      <button
        type="button"
        onClick={() => {
          setTheme(dark ? 'light' : 'dark')
        }}
        aria-label={dark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        className={`absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${t.toggleBtn}`}
        style={{ ['--tw-ring-offset-color' as string]: t.page }}
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Soft glow — gently breathes. */}
      <m.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-12%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${t.glow}, transparent 65%)` }}
        animate={reduced ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Faint grid texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(${t.grid} 1px, transparent 1px), linear-gradient(90deg, ${t.grid} 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(circle at 50% 40%, black, transparent 75%)',
        }}
      />
      {/* Grounding vignette. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 50% 0%, transparent 55%, ${t.vignette})` }}
      />

      {/* Floating, layered card. */}
      <m.div
        initial={reduced ? false : { opacity: 0, y: 22, scale: 0.98 }}
        animate={reduced ? false : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: duration.long, ease: ease.out }}
        className="relative w-full max-w-md"
      >
        <m.div
          animate={reduced ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* Back sheets — peek above + behind the main card for depth. */}
          <div
            aria-hidden
            className="absolute -top-7 left-1/2 h-full w-[86%] -translate-x-1/2 rounded-[1.9rem] border backdrop-blur-sm"
            style={{ background: t.layer2, borderColor: t.layerBorder }}
          />
          <div
            aria-hidden
            className="absolute -top-3.5 left-1/2 h-full w-[93%] -translate-x-1/2 rounded-[1.85rem] border backdrop-blur-md"
            style={{ background: t.layer1, borderColor: t.layerBorder }}
          />

          {/* Main card. */}
          <div
            className="relative rounded-[1.75rem] border p-8 backdrop-blur-xl sm:p-10"
            style={{ background: t.card, borderColor: t.cardBorder, boxShadow: t.cardShadow }}
          >
            {/* top inner highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[1.75rem]"
              style={{
                background: dark
                  ? 'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.25), transparent)'
                  : 'linear-gradient(90deg, transparent, oklch(0.2 0 0 / 0.08), transparent)',
              }}
            />

            <div className="flex flex-col items-center text-center">
              <span
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border shadow-lg"
                style={{ background: t.badge, borderColor: t.badgeBorder, color: t.text }}
              >
                <LoginHeroFallback className="h-9 w-9" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight" style={{ color: t.text }}>
                ยินดีต้อนรับกลับมา
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: t.muted }}>
                เข้าสู่ระบบ SmartBrew POS เพื่อเริ่มกะการขาย
              </p>
            </div>

            <div className="mt-8">
              <LoginForm theme={theme} />
            </div>
          </div>
        </m.div>

        <p className="mt-8 text-center text-xs" style={{ color: t.faint }}>
          SmartBrew POS · ระบบขายหน้าร้านสำหรับคาเฟ่
        </p>
      </m.div>
    </div>
  )
}
