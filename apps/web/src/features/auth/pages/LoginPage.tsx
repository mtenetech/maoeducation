import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { BookMarked, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { useLogin } from '../hooks/useLogin'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
  institutionCode: z.string().min(1, 'Requerido'),
  email:           z.string().email('Email inválido'),
  password:        z.string().min(1, 'Requerido'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const { mutate: login, isPending } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { institutionCode: 'ESCUELA_DEMO' },
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
            <BookMarked className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">MaoEducación</h1>
            <p className="text-sm text-slate-400">Sistema de Gestión Académica</p>
          </div>
        </div>

        {/* Card */}
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Iniciar sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresa tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="institutionCode" className="text-slate-300">
                  Código de institución
                </Label>
                <Input
                  id="institutionCode"
                  placeholder="ESCUELA_DEMO"
                  {...register('institutionCode')}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-primary/50"
                />
                {errors.institutionCode && (
                  <p className="text-xs text-red-400">{errors.institutionCode.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@escuela.edu"
                  {...register('email')}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-primary/50"
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
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
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-primary/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                loading={isPending}
                className="w-full mt-2"
              >
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MaoEducación
        </p>
      </div>
    </div>
  )
}
