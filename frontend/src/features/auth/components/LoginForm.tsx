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

const FIELD =
  'h-11 pl-10 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0'

export function LoginForm() {
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
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            placeholder="เช่น barista01"
            aria-invalid={errors.username ? true : undefined}
            className={FIELD}
            {...register('username')}
          />
        </div>
        {errors.username && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={errors.password ? true : undefined}
            className={`${FIELD} pr-10`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => {
              setShowPassword((v) => !v)
            }}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center
                       justify-center rounded-md text-text-muted transition-colors hover:text-text
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full bg-primary text-primary-fg shadow-sm hover:bg-primary/90
                   focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-0"
      >
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
