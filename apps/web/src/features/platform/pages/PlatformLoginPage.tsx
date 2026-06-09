import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { usePlatformLogin } from '../hooks/usePlatform'
import { usePlatformAuthStore } from '@/store/platformAuth.store'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
})

type LoginForm = z.infer<typeof loginSchema>

export function PlatformLoginPage() {
  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated())
  const { mutate: login, isPending } = usePlatformLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  if (isAuthenticated) return <Navigate to="/platform" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Plataforma</h1>
            <p className="text-sm text-slate-400">Administración de instituciones</p>
          </div>
        </div>

        <Card className="border-slate-700/50 bg-slate-800/50 shadow-2xl backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Acceso superadmin</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresa tus credenciales de plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@mao.edu"
                  {...register('email')}
                  className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-primary/50"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="border-slate-600 bg-slate-700/50 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <Button type="submit" loading={isPending} className="mt-2 w-full">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">© {new Date().getFullYear()} Auleka</p>
      </div>
    </div>
  )
}
