import type { FastifyRequest } from 'fastify'
import { prisma } from '../database/prisma'
import { ForbiddenError } from '../../domain/errors/app.errors'

/** Roles que ven la información de cualquier estudiante de la institución. */
const PRIVILEGED_ROLES = ['admin', 'rector', 'dece', 'inspector']

export function isPrivilegedStaff(roles: string[]): boolean {
  return roles.some((r) => PRIVILEGED_ROLES.includes(r))
}

/**
 * Paralelos que "pertenecen" a un docente: donde dicta alguna materia
 * (course_assignments) o donde es tutor del paralelo.
 */
export async function getTeacherParallelIds(
  institutionId: string,
  teacherId: string,
): Promise<string[]> {
  const [assignments, tutored] = await Promise.all([
    prisma.courseAssignment.findMany({
      where: { institutionId, teacherId },
      select: { parallelId: true },
    }),
    prisma.parallel.findMany({
      where: { institutionId, tutorId: teacherId },
      select: { id: true },
    }),
  ])
  const ids = new Set<string>()
  for (const a of assignments) ids.add(a.parallelId)
  for (const p of tutored) ids.add(p.id)
  return [...ids]
}

/** ¿El estudiante está matriculado en alguno de los paralelos del docente? */
export async function studentInTeacherScope(
  institutionId: string,
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const parallelIds = await getTeacherParallelIds(institutionId, teacherId)
  if (parallelIds.length === 0) return false
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { institutionId, studentId, parallelId: { in: parallelIds } },
    select: { id: true },
  })
  return !!enrollment
}

/**
 * Garantiza que el actor puede ver/editar la ficha del estudiante:
 * - staff privilegiado (admin/rector/dece/inspector): siempre.
 * - docente: solo estudiantes de sus paralelos (dicta o es tutor).
 * - cualquier otro: prohibido.
 */
export async function assertStudentFichaAccess(
  req: FastifyRequest,
  studentId: string,
): Promise<void> {
  const { sub, institutionId, roles } = req.user
  if (isPrivilegedStaff(roles)) return
  if (roles.includes('teacher')) {
    const ok = await studentInTeacherScope(institutionId, sub, studentId)
    if (ok) return
  }
  throw new ForbiddenError()
}
