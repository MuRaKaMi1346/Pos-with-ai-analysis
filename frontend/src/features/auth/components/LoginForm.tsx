import { zodResolver } from '@hookform/resolvers/zod'
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

export function LoginForm() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" autoComplete="username" autoFocus {...register('username')} />
        {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </Button>
    </form>
  )
}
