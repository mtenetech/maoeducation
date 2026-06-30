import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { usePersonalLogin } from '../hooks/usePersonalAuth'
import { useAuthStore } from '@/store/auth.store'
import { Navigate } from 'react-router-dom'

const schema = z.object({
  email: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
})
type Form = z.infer<typeof schema>

export function PersonalLoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const { mutate, isPending, error } = usePersonalLogin()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/logo.svg" alt="Auleka" className="w-32 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido/a</h1>
          <p className="text-sm text-gray-500 mt-1">Accede a tu aula personal</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
            {(error as Error).message ?? 'Credenciales inválidas'}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="profe@ejemplo.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link to="/personal/register" className="text-blue-600 hover:underline">Regístrate gratis</Link>
          </p>
          <p className="text-xs text-gray-400">
            ¿Tu institución usa Auleka?{' '}
            <Link to="/login" className="text-gray-400 hover:underline">Ingresa aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
