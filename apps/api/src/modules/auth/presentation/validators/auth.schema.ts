import { z } from 'zod'

export const loginSchema = z.object({
  // Admite correo o cédula como identificador.
  email:           z.string().min(1, 'El usuario es requerido'),
  password:        z.string().min(1, 'La contraseña es requerida'),
  institutionCode: z.string().min(1, 'El código de institución es requerido'),
})

export type LoginBody = z.infer<typeof loginSchema>
