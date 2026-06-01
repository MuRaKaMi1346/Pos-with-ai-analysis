import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, LogIn, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getMe, login as loginRequest } from '@/features/auth/api/auth'
import { useAuthStore } from '@/features/auth/stores/authStore'

const schema = z.object({
  username: z.string().min(1, 'จำเป็นต้องใส่ username'),
  password: z.string().min(1, 'จำเป็นต้องใส่ password'),
})

type FormValues = z.infer<typeof schema>

type Theme = 'dark' | 'light'

/** Monochrome field / label / button styling per theme, over the Input base. */
function styles(dark: boolean) {
  return {
    field: dark
      ? 'h-11 pl-10 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35 ' +
        'focus-visible:ring-white/70 focus-visible:ring-offset-0 focus-visible:border-white/30'
      : 'h-11 pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 ' +
        'focus-visible:ring-slate-900 focus-visible:ring-offset-0 focus-visible:border-slate-500',
    label: dark ? 'text-white/80' : 'text-slate-700',
    icon: dark ? 'text-white/40' : 'text-slate-400',
    toggle: dark
      ? 'text-white/45 hover:text-white focus-visible:ring-white/70'
      : 'text-slate-400 hover:text-slate-700 focus-visible:ring-slate-900',
    error: dark ? 'text-xs text-red-300' : 'text-xs text-red-600',
    button: dark
      ? 'mt-1 h-11 w-full bg-white text-[oklch(0.15_0_0)] shadow-sm hover:bg-white/90 ' +
        'focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.15_0_0)]'
      : 'mt-1 h-11 w-full bg-slate-900 text-white shadow-sm hover:bg-slate-800 ' +
        'focus-visible:ring-slate-900 focus-visible:ring-offset-2',
  }
}

export function LoginForm({ theme = 'dark' }: { theme?: Theme }) {
  const s = styles(theme === 'dark')
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const token = await loginRequest(values.username, values.password)
      setAccessToken(token)
      const user = await getMe(token)
      setUser(user)
      toast.success('เข้าสู่ระบบสำเร็จ')
      navigate('/pos', { replace: true })
    } catch {
      toast.error('Username หรือ password ไม่ถูกต้อง')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="username" className={s.label}>
          Username
        </Label>
        <div className="relative">
          <User
            aria-hidden
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${s.icon}`}
          />
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            placeholder="เช่น barista01"
            aria-invalid={errors.username ? true : undefined}
            className={s.field}
            {...register('username')}
          />
        </div>
        {errors.username && (
          <p role="alert" className={s.error}>
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className={s.label}>
          Password
        </Label>
        <div className="relative">
          <Lock
            aria-hidden
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${s.icon}`}
          />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? true : undefined}
            className={`${s.field} pr-10`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => {
              setShowPassword((v) => !v)
            }}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            aria-pressed={showPassword}
            className={`absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center
                       justify-center rounded-md transition-colors focus-visible:outline-none
                       focus-visible:ring-2 ${s.toggle}`}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p role="alert" className={s.error}>
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className={s.button}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังเข้าสู่ระบบ…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            เข้าสู่ระบบ
          </>
        )}
      </Button>
    </form>
  )
}
