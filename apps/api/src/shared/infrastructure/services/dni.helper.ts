import { prisma } from '../database/prisma'
import { BadRequestError, ConflictError } from '../../domain/errors/app.errors'

/**
 * Reglas de cédula (aplican a la creación de cualquier usuario):
 *  - Obligatoria, 10 dígitos.
 *  - Única dentro de la institución (no se permiten cédulas duplicadas).
 *  - Es la contraseña por defecto del usuario (ver uso en los repos).
 */
export function assertValidDni(dni?: string): string {
  const d = (dni ?? '').trim()
  if (!/^\d{10}$/.test(d)) {
    throw new BadRequestError('La cédula es obligatoria y debe tener 10 dígitos')
  }
  return d
}

/** Lanza ConflictError si ya existe un usuario con esa cédula en la institución. */
export async function assertDniUnique(
  institutionId: string,
  dni: string,
  excludeUserId?: string,
): Promise<void> {
  const existing = await prisma.profile.findFirst({
    where: {
      dni,
      user: { institutionId },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  if (existing) throw new ConflictError('Ya existe un usuario con esa cédula')
}
