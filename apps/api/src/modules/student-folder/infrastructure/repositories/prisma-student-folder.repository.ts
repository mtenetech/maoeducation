import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import {
  isPrivilegedStaff,
  getTeacherParallelIds,
} from '../../../../shared/infrastructure/services/teacher-scope.service'
import type { FolderActor, StudentListItem } from '../../application/dtos/student-folder.dto'

const personSelect = {
  id: true,
  profile: { select: { firstName: true, lastName: true, dni: true } },
}

function fullName(
  p: { profile: { firstName: string; lastName: string } | null } | null,
  fallback = '',
): string {
  if (!p?.profile) return fallback
  return `${p.profile.firstName} ${p.profile.lastName}`.trim()
}

export class PrismaStudentFolderRepository {
  /**
   * Estudiantes cuyo expediente puede abrir el actor:
   * - staff privilegiado (admin/rector/dece/inspector) → todos los `student`.
   * - docente → estudiantes matriculados en sus paralelos (dicta o es tutor).
   */
  async listAccessibleStudents(
    institutionId: string,
    actor: FolderActor,
  ): Promise<StudentListItem[]> {
    let students: Array<{
      id: string
      profile: { firstName: string; lastName: string; dni: string | null } | null
    }>

    if (isPrivilegedStaff(actor.roles)) {
      students = await prisma.user.findMany({
        where: { institutionId, userRoles: { some: { role: { name: 'student' } } } },
        select: personSelect,
      })
    } else if (actor.roles.includes('teacher')) {
      const parallelIds = await getTeacherParallelIds(institutionId, actor.userId)
      if (parallelIds.length === 0) return []
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { institutionId, parallelId: { in: parallelIds } },
        select: { student: { select: personSelect } },
      })
      const byId = new Map(enrollments.map((e) => [e.student.id, e.student]))
      students = [...byId.values()]
    } else {
      return []
    }

    return students
      .map((s) => ({ id: s.id, fullName: fullName(s), dni: s.profile?.dni ?? null }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }

  /** Expediente consolidado del estudiante: datos, matrículas, incidentes, actas y atenciones. */
  async getFolder(studentId: string, institutionId: string) {
    const student = await prisma.user.findFirst({
      where: { id: studentId, institutionId },
      include: {
        profile: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    const [enrollments, incidents, parentMeetings] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: { institutionId, studentId },
        include: {
          parallel: { include: { level: { select: { name: true, code: true } } } },
          academicYear: { select: { id: true, name: true, startDate: true } },
        },
        orderBy: { academicYear: { startDate: 'desc' } },
      }),
      prisma.disciplinaryIncident.findMany({
        where: { institutionId, studentId },
        include: {
          incidentType: { select: { id: true, name: true, severity: true } },
          reporter: { select: personSelect },
          commitments: {
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: personSelect } },
          },
        },
        orderBy: { incidentDate: 'desc' },
      }),
      prisma.parentMeeting.findMany({
        where: { institutionId, studentId },
        include: { recorder: { select: personSelect } },
        orderBy: [{ meetingDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    // Apartado "Actas": actas de compromiso de incidentes + actas de atención a padres.
    const actas = [
      ...incidents.flatMap((inc) =>
        inc.commitments.map((c) => ({
          kind: 'incident_commitment' as const,
          id: c.id,
          incidentId: inc.id,
          title: `Acta de compromiso — ${inc.incidentType?.name ?? inc.category}`,
          createdAt: c.createdAt,
          status: c.status,
          downloadUrl: `incidents/${inc.id}/commitments/${c.id}/pdf`,
        })),
      ),
      ...parentMeetings.map((m) => ({
        kind: 'parent_meeting' as const,
        id: m.id,
        incidentId: null,
        title: `Acta de atención — ${m.subject}`,
        createdAt: m.createdAt,
        status: m.signedAt ? 'signed' : 'draft',
        downloadUrl: `parent-meetings/${m.id}/acta.pdf`,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      student: {
        id: student.id,
        email: student.email,
        fullName: fullName(student),
        roles: student.userRoles.map((ur) => ur.role.name),
        profile: student.profile,
      },
      enrollments,
      incidents,
      parentMeetings,
      actas,
    }
  }

  /** Matrícula + datos para el certificado de matrícula (PDF). */
  async getEnrollmentForCertificate(studentId: string, enrollmentId: string, institutionId: string) {
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { id: enrollmentId, studentId, institutionId },
      include: {
        parallel: { include: { level: { select: { name: true } } } },
        academicYear: { select: { name: true, startDate: true, endDate: true } },
        student: { select: personSelect },
        institution: { select: { name: true, settings: true } },
      },
    })
    if (!enrollment) throw new NotFoundError('Matrícula no encontrada')
    return enrollment
  }
}
