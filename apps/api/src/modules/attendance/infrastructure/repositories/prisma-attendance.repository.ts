import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError, BadRequestError } from '../../../../shared/domain/errors/app.errors'
import type { BulkAttendanceDto, CreateJustificationDto } from '../../application/dtos/attendance.dto'

export class PrismaAttendanceRepository {
  async getByDate(institutionId: string, courseAssignmentId: string, date: string) {
    const courseAssignment = await prisma.courseAssignment.findFirst({
      where: { id: courseAssignmentId, institutionId },
      include: {
        parallel: { select: { academicYearId: true } },
      },
    })
    if (!courseAssignment) throw new NotFoundError('Asignación de curso no encontrada')

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        parallelId: courseAssignment.parallelId,
        academicYearId: courseAssignment.academicYearId,
      },
      include: {
        student: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, dni: true } },
          },
        },
      },
    })

    const records = await prisma.attendanceRecord.findMany({
      where: {
        courseAssignmentId,
        date: new Date(date),
        institutionId,
      },
    })

    const gradeMap = new Map(records.map((r) => [r.studentId, r]))

    return enrollments.map((e) => ({
      student: e.student,
      record: gradeMap.get(e.studentId) ?? null,
    }))
  }

  async bulkUpsert(institutionId: string, dto: BulkAttendanceDto, recordedById: string) {
    const parsedDate = new Date(dto.date)

    const courseAssignment = await prisma.courseAssignment.findFirst({
      where: { id: dto.courseAssignmentId, institutionId },
    })
    if (!courseAssignment) throw new NotFoundError('Asignación de curso no encontrada')

    const results = await Promise.all(
      dto.records.map((r) =>
        prisma.attendanceRecord.upsert({
          where: {
            courseAssignmentId_studentId_date: {
              courseAssignmentId: dto.courseAssignmentId,
              studentId: r.studentId,
              date: parsedDate,
            },
          },
          create: {
            institutionId,
            courseAssignmentId: dto.courseAssignmentId,
            studentId: r.studentId,
            date: parsedDate,
            status: r.status,
            notes: r.notes,
            recordedBy: recordedById,
          },
          update: {
            status: r.status,
            notes: r.notes,
            recordedBy: recordedById,
          },
        }),
      ),
    )

    return results
  }

  async getStudentSummary(institutionId: string, studentId: string, courseAssignmentId?: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        institutionId,
        studentId,
        ...(courseAssignmentId && { courseAssignmentId }),
      },
      include: {
        courseAssignment: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Group by courseAssignmentId
    const grouped = new Map<
      string,
      {
        courseAssignment: { id: string; subject: { id: string; name: string } }
        total: number
        present: number
        absent: number
        late: number
        excused: number
      }
    >()

    for (const record of records) {
      const key = record.courseAssignmentId
      if (!grouped.has(key)) {
        grouped.set(key, {
          courseAssignment: {
            id: record.courseAssignment.id,
            subject: record.courseAssignment.subject,
          },
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        })
      }

      const entry = grouped.get(key)!
      entry.total += 1

      if (record.status === 'present') entry.present += 1
      else if (record.status === 'absent') entry.absent += 1
      else if (record.status === 'late') entry.late += 1
      else if (record.status === 'excused') entry.excused += 1
    }

    return Array.from(grouped.values())
  }

  async createJustification(
    institutionId: string,
    dto: CreateJustificationDto,
    justifiedById: string,
  ) {
    const student = await prisma.user.findFirst({
      where: { id: dto.studentId, institutionId },
    })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        id: { in: dto.attendanceRecordIds },
        studentId: dto.studentId,
        institutionId,
      },
    })

    if (attendanceRecords.length !== dto.attendanceRecordIds.length) {
      throw new BadRequestError(
        'Uno o más registros de asistencia no pertenecen al estudiante o no existen',
      )
    }

    const justification = await prisma.absenceJustification.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        reason: dto.reason,
        documentUrl: dto.documentUrl,
        justifiedBy: justifiedById,
      },
    })

    await prisma.justificationAttendance.createMany({
      data: dto.attendanceRecordIds.map((attendanceRecordId) => ({
        justificationId: justification.id,
        attendanceRecordId,
      })),
    })

    await prisma.attendanceRecord.updateMany({
      where: {
        id: { in: dto.attendanceRecordIds },
      },
      data: { status: 'excused' },
    })

    return justification
  }
}
