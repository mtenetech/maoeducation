import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { usePersonalRegister } from '../hooks/usePersonalAuth'

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type Form = z.infer<typeof schema>

export function PersonalRegisterPage() {
  const { mutate, isPending, error } = usePersonalRegister()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden md:flex md:w-5/12 lg:w-1/2 relative flex-col items-start justify-center px-12 py-16 overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #2563EB 0%, #16A34A 100%)' }}
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/8 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-10 max-w-md">
          <img src="/logo-white.svg" alt="Auleka" className="w-40" />
          <div>
            <p className="text-white text-2xl font-bold leading-snug">
              Tu aula digital,<br />a tu medida.
            </p>
            <p className="text-white/80 mt-3 text-base leading-relaxed">
              Calificaciones, asistencia y reportes. Sin depender de un sistema institucional.
            </p>
          </div>
          <ul className="space-y-2">
            {['Calificaciones y asistencia', 'Importa estudiantes desde Excel', 'Reportes con tu logo', 'Gratis para empezar'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-white/90 text-sm">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crea tu aula</h1>
            <p className="text-sm text-gray-500 mt-1">
              ¿Ya tienes cuenta? <Link to="/personal/login" className="text-blue-600 hover:underline">Inicia sesión</Link>
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(error as Error).message ?? 'Error al crear la cuenta'}
            </div>
          )}

          <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" placeholder="Ana" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" placeholder="García" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

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
                  placeholder="Mínimo 6 caracteres"
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
              {isPending ? 'Creando cuenta...' : 'Comenzar gratis'}
            </Button>
          </form>

          <p className="text-xs text-center text-gray-400">
            ¿Tu institución ya usa Auleka?{' '}
            <Link to="/login" className="text-gray-500 hover:underline">Ingresa aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
