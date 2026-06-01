import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { BarChart3, Boxes, Zap } from 'lucide-react'
import { useRef, type PointerEvent, type ReactNode } from 'react'

import { LoginHeroFallback } from '@/features/auth/components/LoginHeroFallback'

interface Feature {
  icon: ReactNode
  label: string
  /** Parallax depth multiplier — bigger = floats more against the pointer. */
  depth: number
  className: string
}

const FEATURES: Feature[] = [
  {
    icon: <Zap className="h-4 w-4" />,
    label: 'ขายไว ปิดบิลไม่สะดุด',
    depth: 1.4,
    className: 'left-6 top-[22%]',
  },
  {
    icon: <Boxes className="h-4 w-4" />,
    label: 'ตัดสต็อกอัตโนมัติ',
    depth: 1,
    className: 'right-6 top-[40%]',
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    label: 'รายงานยอดขายเรียลไทม์',
    depth: 1.7,
    className: 'left-10 bottom-[20%]',
  },
]

/**
 * The login brand panel. Replaces the old low-poly R3F cup with an aurora-lit
 * espresso surface and CSS-3D pointer parallax: a frosted medallion holding the
 * brand mark tilts toward the pointer while glass feature cards float at varying
 * depths. No WebGL — runs on the compositor. Under reduced motion the aurora and
 * parallax are frozen and only the static composition remains.
 */
export function LoginHero() {
  const reduced = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)

  // Pointer position within the panel, -0.5..0.5, smoothed.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 140, damping: 20 })
  const sy = useSpring(py, { stiffness: 140, damping: 20 })

  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10])

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function handlePointerLeave(): void {
    px.set(0)
    py.set(0)
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative flex min-h-[42vh] flex-1 items-center justify-center overflow-hidden
                 bg-[#241712] md:min-h-dvh"
      style={{ perspective: 1000 }}
    >
      {/* Aurora blobs — slow drift, frozen under reduced motion. */}
      <m.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, oklch(0.55 0.18 35 / 0.55), transparent 70%)' }}
        animate={reduced ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, oklch(0.55 0.2 300 / 0.45), transparent 70%)' }}
        animate={reduced ? undefined : { x: [0, -36, 0], y: [0, -24, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        aria-hidden
        className="pointer-events-none absolute left-1/3 top-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, oklch(0.62 0.13 200 / 0.35), transparent 70%)' }}
        animate={reduced ? undefined : { x: [0, 30, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Vignette for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 120% at 50% 30%, transparent 40%, oklch(0 0 0 / 0.45))' }}
      />

      {/* Parallax stage. */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        {FEATURES.map((f) => (
          <ParallaxCard key={f.label} sx={sx} sy={sy} depth={f.depth} className={f.className}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
              {f.icon}
            </span>
            <span className="text-sm font-medium text-white">{f.label}</span>
          </ParallaxCard>
        ))}
      </div>

      {/* Brand medallion — tilts toward the pointer. */}
      <m.div
        className="relative flex h-44 w-44 items-center justify-center rounded-[2rem] border border-white/15
                   bg-white/10 shadow-2xl backdrop-blur-md"
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={reduced ? false : { opacity: 0, scale: 0.9 }}
        animate={reduced ? false : { opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <LoginHeroFallback className="h-28 w-28 drop-shadow-lg" />
      </m.div>

      {/* Wordmark. */}
      <div className="pointer-events-none absolute bottom-8 left-8 right-8">
        <p className="text-2xl font-bold tracking-tight text-white">SmartBrew POS</p>
        <p className="mt-1 text-sm text-white/70">ระบบขายหน้าร้านสำหรับคาเฟ่ยุคใหม่</p>
      </div>
    </div>
  )
}

interface ParallaxCardProps {
  sx: ReturnType<typeof useSpring>
  sy: ReturnType<typeof useSpring>
  depth: number
  className: string
  children: ReactNode
}

/** A frosted feature pill that floats against the pointer at a given depth. */
function ParallaxCard({ sx, sy, depth, className, children }: ParallaxCardProps) {
  const x = useTransform(sx, [-0.5, 0.5], [-18 * depth, 18 * depth])
  const y = useTransform(sy, [-0.5, 0.5], [-18 * depth, 18 * depth])

  return (
    <m.div
      style={{ x, y }}
      className={`absolute inline-flex items-center gap-2 rounded-full border border-white/15
                  bg-white/10 px-3 py-2 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </m.div>
  )
}
