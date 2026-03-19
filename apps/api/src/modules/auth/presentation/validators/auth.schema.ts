import { z } from 'zod'

export const loginSchema = z.object({
  email:           z.string().email('Email inválido'),
  password:        z.string().min(1, 'La contraseña es requerida'),
  institutionCode: z.string().min(1, 'El código de institución es requerido'),
})

export type LoginBody = z.infer<typeof loginSchema>
