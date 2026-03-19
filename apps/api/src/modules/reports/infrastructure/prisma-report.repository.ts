import { prisma } from '../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../shared/domain/errors/app.errors'
import type { GradesReportQuery, AttendanceReportQuery, EnrollmentReportQuery } from '../application/dtos/report.dto'

export class PrismaReportRepository {
  async getGradesReport(
    institutionId: string,
    query: GradesReportQuery,
    caller?: { userId: string; roles: string[] },
  ) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: { id: query.courseAssignmentId, institutionId },
      select: {
        id: true,
        parallelId: true,
        academicYearId: true,
        examWeight: true,
        subject: true,
        parallel: { include: { level: true } },
        teacher: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        academicYear: { select: { id: true, name: true } },
      },
    })
    if (!assignment) throw new NotFoundError('Asignación no encontrada')

    const insumos = await prisma.insumo.findMany({
      where: { institutionId, courseAssignmentId: query.courseAssignmentId, academicPeriodId: query.periodId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        activities: {
          where: { isPublished: true },
          orderBy: { activityDate: 'asc' },
          include: {
            grades: { where: { institutionId }, select: { studentId: true, score: true } },
            activityType: { select: { code: true, name: true } },
          },
        },
      },
    })

    const activitiesWithoutInsumo = await prisma.activity.findMany({
      where: {
        institutionId,
        courseAssignmentId: query.courseAssignmentId,
        academicPeriodId: query.periodId,
        isPublished: true,
        insumoId: null,
      },
      orderBy: { activityDate: 'asc' },
      include: {
        grades: { where: { institutionId }, select: { studentId: true, score: true } },
        activityType: { select: { code: true, name: true } },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allInsumos: any[] = [...insumos]
    if (activitiesWithoutInsumo.length > 0) {
      allInsumos.push({
        id: 'no-insumo',
        name: 'Sin insumo',
        weight: null,
        sortOrder: 9999,
        activities: activitiesWithoutInsumo,
      })
    }

    // Resolve studentId filter for student/guardian roles
    let studentIdFilter: string | undefined
    if (caller) {
      if (caller.roles.includes('student')) {
        studentIdFilter = caller.userId
      } else if (caller.roles.includes('guardian')) {
        const link = await prisma.guardianStudent.findFirst({
          where: { guardianId: caller.userId },
          select: { studentId: true },
        })
        if (link) studentIdFilter = link.studentId
      }
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        parallelId: assignment.parallelId,
        academicYearId: assignment.academicYearId,
        ...(studentIdFilter ? { studentId: studentIdFilter } : {}),
      },
      include: {
        student: { select: { id: true, profile: { select: { firstName: true, lastName: true, dni: true } } } },
      },
      orderBy: [
        { student: { profile: { lastName: 'asc' } } },
        { student: { profile: { firstName: 'asc' } } },
      ],
    })

    // Build grade map: studentId -> activityId -> score
    const gradeMap = new Map<string, Map<string, number | null>>()
    for (const insumo of allInsumos) {
      for (const activity of insumo.activities) {
        for (const grade of activity.grades) {
          if (!gradeMap.has(grade.studentId)) gradeMap.set(grade.studentId, new Map())
          gradeMap.get(grade.studentId)!.set(activity.id, grade.score ? Number(grade.score) : null)
        }
      }
    }

    return {
      assignment,
      insumos: allInsumos,
      students: enrollments.map((e) => ({
        student: e.student,
        grades: gradeMap.get(e.studentId.toString()) ? Object.fromEntries(gradeMap.get(e.studentId)!) : {},
      })),
    }
  }

  async getMyGrades(institutionId: string, studentId: string, periodId: string) {
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { institutionId, studentId },
      select: { parallelId: true, academicYearId: true },
    })
    if (enrollments.length === 0) return []

    const assignments = await prisma.courseAssignment.findMany({
      where: {
        institutionId,
        OR: enrollments.map((e) => ({ parallelId: e.parallelId, academicYearId: e.academicYearId })),
      },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { subject: { name: 'asc' } },
    })

    function avg(scores: (number | null)[]): number | null {
      const valid = scores.filter((s): s is number => s !== null)
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
    }

    const results = []
    for (const assignment of assignments) {
      const insumos = await prisma.insumo.findMany({
        where: { institutionId, courseAssignmentId: assignment.id, academicPeriodId: periodId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          activities: {
            where: { isPublished: true },
            include: {
              grades: { where: { studentId, institutionId }, select: { score: true } },
              activityType: { select: { code: true } },
            },
          },
        },
      })

      const examActivityIds = new Set<string>()
      for (const ins of insumos) {
        for (const act of ins.activities) {
          if (act.activityType.code === 'exam') examActivityIds.add(act.id)
        }
      }

      // Only show insumos that have at least one non-exam activity (exam-only insumos are covered by the Examen column)
      const insumoColumns = insumos
        .filter((ins) => ins.activities.some((a) => !examActivityIds.has(a.id)))
        .map((ins) => ({
          name: ins.name,
          avg: avg(
            ins.activities
              .filter((a) => !examActivityIds.has(a.id))
              .map((a) => (a.grades[0]?.score ? Number(a.grades[0].score) : null)),
          ),
        }))

      const regularScores = insumos
        .flatMap((i) => i.activities.filter((a) => !examActivityIds.has(a.id)))
        .map((a) => (a.grades[0]?.score ? Number(a.grades[0].score) : null))
      const examScores = insumos
        .flatMap((i) => i.activities.filter((a) => examActivityIds.has(a.id)))
        .map((a) => (a.grades[0]?.score ? Number(a.grades[0].score) : null))

      const regularAvg = avg(regularScores)
      const examAvg = avg(examScores)
      const examWeight = assignment.examWeight
      const regularWeight = 100 - examWeight

      let total: number | null = null
      if (examScores.length > 0) {
        if (regularAvg !== null && examAvg !== null) total = regularAvg * (regularWeight / 100) + examAvg * (examWeight / 100)
        else if (regularAvg !== null) total = regularAvg * (regularWeight / 100)
        else if (examAvg !== null) total = examAvg * (examWeight / 100)
      } else {
        total = regularAvg
      }

      results.push({
        assignmentId: assignment.id,
        subjectName: assignment.subject.name,
        teacherName: assignment.teacher?.profile
          ? `${assignment.teacher.profile.firstName} ${assignment.teacher.profile.lastName}`
          : '',
        examWeight,
        insumoColumns,
        regularAvg,
        examAvg: examScores.length > 0 ? examAvg : undefined,
        total,
      })
    }
    return results
  }

  async getAttendanceReport(institutionId: string, query: AttendanceReportQuery) {
    const assignment = await prisma.courseAssignment.findFirst({
      where: { id: query.courseAssignmentId, institutionId },
      include: {
        subject: true,
        parallel: { include: { level: true } },
        academicYear: { select: { id: true, name: true } },
      },
    })
    if (!assignment) throw new NotFoundError('Asignación no encontrada')

    const records = await prisma.attendanceRecord.findMany({
      where: {
        institutionId,
        courseAssignmentId: query.courseAssignmentId,
        date: { gte: new Date(query.startDate), lte: new Date(query.endDate) },
      },
      include: {
        student: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ date: 'asc' }, { student: { profile: { lastName: 'asc' } } }],
    })

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { institutionId, parallelId: assignment.parallelId, academicYearId: assignment.academicYearId },
      include: {
        student: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [
        { student: { profile: { lastName: 'asc' } } },
        { student: { profile: { firstName: 'asc' } } },
      ],
    })

    const uniqueDates = [...new Set(records.map((r) => r.date.toISOString().split('T')[0]))].sort()

    const recordMap = new Map<string, Map<string, string>>()
    for (const r of records) {
      const dateStr = r.date.toISOString().split('T')[0]
      if (!recordMap.has(r.studentId)) recordMap.set(r.studentId, new Map())
      recordMap.get(r.studentId)!.set(dateStr, r.status)
    }

    return {
      assignment,
      dates: uniqueDates,
      students: enrollments.map((e) => ({
        student: e.student,
        records: Object.fromEntries(recordMap.get(e.studentId) ?? new Map()),
      })),
    }
  }

  async getEnrollmentReport(institutionId: string, query: EnrollmentReportQuery) {
    const year = await prisma.academicYear.findFirst({ where: { id: query.yearId, institutionId } })
    if (!year) throw new NotFoundError('Año académico no encontrado')

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        academicYearId: query.yearId,
        ...(query.parallelId && { parallelId: query.parallelId }),
      },
      include: {
        student: { select: { id: true, profile: { select: { firstName: true, lastName: true, dni: true, birthDate: true } } } },
        parallel: { include: { level: true } },
      },
      orderBy: [
        { parallel: { level: { sortOrder: 'asc' } } },
        { parallel: { name: 'asc' } },
        { student: { profile: { lastName: 'asc' } } },
      ],
    })

    // Group by parallel
    const grouped = new Map<string, { parallel: typeof enrollments[0]['parallel']; enrollments: typeof enrollments }>()
    for (const e of enrollments) {
      const key = e.parallelId
      if (!grouped.has(key)) grouped.set(key, { parallel: e.parallel, enrollments: [] })
      grouped.get(key)!.enrollments.push(e)
    }

    return {
      year,
      totalEnrollments: enrollments.length,
      parallels: Array.from(grouped.values()),
    }
  }
}
