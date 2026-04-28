import { prisma } from '../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../shared/domain/errors/app.errors'
import type {
  GradesReportQuery,
  AttendanceReportQuery,
  EnrollmentReportQuery,
  BulletinOptionsQuery,
  BulletinReportQuery,
} from '../application/dtos/report.dto'

export class PrismaReportRepository {
  private avg(scores: (number | null)[]) {
    const valid = scores.filter((s): s is number => s !== null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }

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

  async getBulletinOptions(
    institutionId: string,
    query: BulletinOptionsQuery,
    caller: { userId: string; roles: string[] },
  ) {
    const isAdminLike = caller.roles.includes('admin') || caller.roles.includes('inspector')
    const isTeacher = caller.roles.includes('teacher') && !isAdminLike

    let assignments: Array<{
      parallelId: string
      academicYearId: string
      parallel: { id: string; name: string; level: { name: string } }
      academicYear: { id: string; name: string; isActive: boolean }
    }> = []

    if (isAdminLike) {
      assignments = await prisma.courseAssignment.findMany({
        where: { institutionId, isActive: true },
        select: {
          parallelId: true,
          academicYearId: true,
          parallel: { select: { id: true, name: true, level: { select: { name: true } } } },
          academicYear: { select: { id: true, name: true, isActive: true } },
        },
      })
    } else if (isTeacher) {
      assignments = await prisma.courseAssignment.findMany({
        where: { institutionId, teacherId: caller.userId, isActive: true },
        select: {
          parallelId: true,
          academicYearId: true,
          parallel: { select: { id: true, name: true, level: { select: { name: true } } } },
          academicYear: { select: { id: true, name: true, isActive: true } },
        },
      })
    } else {
      return { years: [], parallels: [], students: [] }
    }

    const yearsMap = new Map<string, { id: string; name: string; isActive: boolean }>()
    const parallelsMap = new Map<string, { id: string; name: string; level: { name: string }; academicYearId: string }>()

    for (const assignment of assignments) {
      yearsMap.set(assignment.academicYear.id, assignment.academicYear)
      parallelsMap.set(assignment.parallelId, {
        id: assignment.parallel.id,
        name: assignment.parallel.name,
        level: assignment.parallel.level,
        academicYearId: assignment.academicYearId,
      })
    }

    const allowedParallels = Array.from(parallelsMap.values()).filter((p) =>
      query.yearId ? p.academicYearId === query.yearId : true,
    )

    const students = query.yearId && query.parallelId
      ? await prisma.studentEnrollment.findMany({
          where: {
            institutionId,
            academicYearId: query.yearId,
            parallelId: query.parallelId,
          },
          select: {
            student: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true, dni: true } },
              },
            },
          },
          orderBy: [
            { student: { profile: { lastName: 'asc' } } },
            { student: { profile: { firstName: 'asc' } } },
          ],
        })
      : []

    return {
      years: Array.from(yearsMap.values()).sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
      parallels: allowedParallels.sort((a, b) =>
        `${a.level.name} ${a.name}`.localeCompare(`${b.level.name} ${b.name}`),
      ),
      students: students.map((e) => ({
        id: e.student.id,
        profile: e.student.profile,
      })),
    }
  }

  async getStudentBulletin(
    institutionId: string,
    query: BulletinReportQuery,
    caller: { userId: string; roles: string[] },
  ) {
    const parallel = await prisma.parallel.findFirst({
      where: { id: query.parallelId, institutionId, academicYearId: query.yearId },
      select: {
        id: true,
        name: true,
        level: { select: { name: true } },
        tutor: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    })
    if (!parallel) throw new NotFoundError('Paralelo no encontrado')

    const year = await prisma.academicYear.findFirst({
      where: { id: query.yearId, institutionId },
      select: { id: true, name: true, startDate: true, endDate: true },
    })
    if (!year) throw new NotFoundError('Año académico no encontrado')

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        institutionId,
        academicYearId: query.yearId,
        parallelId: query.parallelId,
        studentId: query.studentId,
      },
      select: {
        student: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, dni: true } },
          },
        },
      },
    })
    if (!enrollment) throw new NotFoundError('Estudiante no matriculado en el paralelo seleccionado')

    if (caller.roles.includes('teacher') && !caller.roles.includes('admin') && !caller.roles.includes('inspector')) {
      const canAccess = await prisma.courseAssignment.findFirst({
        where: {
          institutionId,
          academicYearId: query.yearId,
          parallelId: query.parallelId,
          teacherId: caller.userId,
        },
        select: { id: true },
      })
      if (!canAccess) throw new NotFoundError('No tienes acceso a este paralelo')
    }

    const periods = await prisma.academicPeriod.findMany({
      where: { institutionId, academicYearId: query.yearId },
      select: { id: true, name: true, periodNumber: true, startDate: true, endDate: true },
      orderBy: [{ periodNumber: 'asc' }, { startDate: 'asc' }],
    })

    const assignments = await prisma.courseAssignment.findMany({
      where: {
        institutionId,
        academicYearId: query.yearId,
        parallelId: query.parallelId,
        isActive: true,
      },
      select: {
        id: true,
        examWeight: true,
        subject: { select: { name: true } },
        teacher: { select: { profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { subject: { name: 'asc' } },
    })

    const assignmentIds = assignments.map((a) => a.id)
    const periodIds = periods.map((p) => p.id)

    const insumos = assignmentIds.length > 0
      ? await prisma.insumo.findMany({
          where: {
            institutionId,
            courseAssignmentId: { in: assignmentIds },
            academicPeriodId: { in: periodIds },
          },
          select: {
            id: true,
            courseAssignmentId: true,
            academicPeriodId: true,
            activities: {
              where: { isPublished: true },
              select: {
                id: true,
                activityType: { select: { code: true } },
                grades: {
                  where: { institutionId, studentId: query.studentId },
                  select: { score: true },
                },
              },
            },
          },
        })
      : []

    const activitiesWithoutInsumo = assignmentIds.length > 0
      ? await prisma.activity.findMany({
          where: {
            institutionId,
            courseAssignmentId: { in: assignmentIds },
            academicPeriodId: { in: periodIds },
            isPublished: true,
            insumoId: null,
          },
          select: {
            id: true,
            courseAssignmentId: true,
            academicPeriodId: true,
            activityType: { select: { code: true } },
            grades: {
              where: { institutionId, studentId: query.studentId },
              select: { score: true },
            },
          },
        })
      : []

    const bucket = new Map<string, Array<{ code: string; score: number | null }>>()
    for (const insumo of insumos) {
      const key = `${insumo.courseAssignmentId}:${insumo.academicPeriodId}`
      if (!bucket.has(key)) bucket.set(key, [])
      for (const activity of insumo.activities) {
        bucket.get(key)!.push({
          code: activity.activityType.code,
          score: activity.grades[0]?.score != null ? Number(activity.grades[0].score) : null,
        })
      }
    }
    for (const activity of activitiesWithoutInsumo) {
      const key = `${activity.courseAssignmentId}:${activity.academicPeriodId}`
      if (!bucket.has(key)) bucket.set(key, [])
      bucket.get(key)!.push({
        code: activity.activityType.code,
        score: activity.grades[0]?.score != null ? Number(activity.grades[0].score) : null,
      })
    }

    const subjects = assignments.map((assignment) => {
      const periodGrades = periods.map((period) => {
        const items = bucket.get(`${assignment.id}:${period.id}`) ?? []
        const regularScores = items.filter((i) => i.code !== 'exam').map((i) => i.score)
        const examScores = items.filter((i) => i.code === 'exam').map((i) => i.score)
        const regularAvg = this.avg(regularScores)
        const examAvg = this.avg(examScores)
        const regularWeight = 100 - assignment.examWeight

        let total: number | null = null
        if (examScores.length > 0) {
          if (regularAvg != null && examAvg != null) total = regularAvg * (regularWeight / 100) + examAvg * (assignment.examWeight / 100)
          else if (regularAvg != null) total = regularAvg
          else if (examAvg != null) total = examAvg
        } else {
          total = regularAvg
        }

        return {
          periodId: period.id,
          periodName: period.name,
          regularAvg,
          examAvg: examScores.length > 0 ? examAvg : null,
          total,
        }
      })

      return {
        assignmentId: assignment.id,
        subjectName: assignment.subject.name,
        teacherName: assignment.teacher?.profile
          ? `${assignment.teacher.profile.firstName} ${assignment.teacher.profile.lastName}`
          : '',
        periodGrades,
        finalAverage: this.avg(periodGrades.map((p) => p.total)),
      }
    })

    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        institutionId,
        studentId: query.studentId,
        courseAssignment: {
          parallelId: query.parallelId,
          academicYearId: query.yearId,
        },
        date: {
          gte: year.startDate,
          lte: year.endDate,
        },
      },
      select: {
        date: true,
        status: true,
      },
      orderBy: { date: 'asc' },
    })

    const dailyStatus = new Map<string, string[]>()
    for (const record of attendanceRecords) {
      const dateStr = record.date.toISOString().split('T')[0]
      if (!dailyStatus.has(dateStr)) dailyStatus.set(dateStr, [])
      dailyStatus.get(dateStr)!.push(record.status)
    }

    const attendanceByPeriod = periods.map((period) => {
      const summary = {
        periodId: period.id,
        periodName: period.name,
        justifiedAbsences: 0,
        unjustifiedAbsences: 0,
        attendedDays: 0,
        lateCount: 0,
      }

      for (const [dateStr, statuses] of dailyStatus.entries()) {
        const date = new Date(`${dateStr}T12:00:00`)
        if (date < period.startDate || date > period.endDate) continue

        if (statuses.includes('absent')) {
          summary.unjustifiedAbsences += 1
        } else if (statuses.includes('late')) {
          summary.attendedDays += 1
          summary.lateCount += 1
        } else if (statuses.includes('excused')) {
          summary.justifiedAbsences += 1
          summary.attendedDays += 1
        } else if (statuses.includes('present')) {
          summary.attendedDays += 1
        }
      }

      return summary
    })

    return {
      institution: await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, name: true },
      }),
      academicYear: { id: year.id, name: year.name },
      parallel,
      student: enrollment.student,
      periods: periods.map((p) => ({ id: p.id, name: p.name, periodNumber: p.periodNumber })),
      subjects,
      attendanceByPeriod,
      overallAverage: this.avg(subjects.map((s) => s.finalAverage)),
    }
  }
}
