import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useLogin } from '../hooks/useLogin'
import { useAuthStore } from '@/store/auth.store'

const loginSchema = z.object({
  institutionCode: z.string().min(1, 'Requerido'),
  email:           z.string().min(1, 'Requerido'),
  password:        z.string().min(1, 'Requerido'),
})

type LoginForm = z.infer<typeof loginSchema>

const FEATURES = [
  'Calificaciones y asistencia en tiempo real',
  'Comunicación directa con padres de familia',
  'Reportes y estadísticas académicas',
  'Gestión de matrículas e incidentes DECE',
]

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
    <div className="min-h-screen flex">
      {/* Left: Auleka brand panel */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-1/2 relative flex-col items-start justify-center px-12 py-16 overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #2563EB 0%, #16A34A 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/8 pointer-events-none" />
        <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-10 max-w-md">
          <img src="/logo-white.svg" alt="Auleka" className="w-48" />

          <div>
            <p className="text-white text-2xl font-bold font-display leading-snug">
              Todo tu colegio<br />en un solo lugar
            </p>
            <p className="text-white/70 text-sm mt-2">
              Gestión académica integral para instituciones educativas
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/85 text-sm">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-6 left-12 text-white/35 text-xs">
          © {new Date().getFullYear()} Auleka
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <img src="/isotipo.svg" alt="Auleka" className="h-16 w-16" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 font-display">Bienvenido</h1>
              <p className="text-sm text-gray-500 mt-1">Ingresa tus credenciales para continuar</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="institutionCode">Código de institución</Label>
              <Input
                id="institutionCode"
                placeholder="ESCUELA_DEMO"
                {...register('institutionCode')}
              />
              {errors.institutionCode && (
                <p className="text-xs text-destructive">{errors.institutionCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo o cédula</Label>
              <Input
                id="email"
                type="text"
                placeholder="correo@escuela.edu o cédula"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" loading={isPending} className="w-full mt-2">
              Ingresar
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Auleka
          </p>
        </div>
      </div>
    </div>
  )
}
