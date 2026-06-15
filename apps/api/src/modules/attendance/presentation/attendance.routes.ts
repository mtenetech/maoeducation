import { FastifyInstance } from 'fastify'
import { PrismaAttendanceRepository } from '../infrastructure/repositories/prisma-attendance.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { isPrivilegedStaff } from '../../../shared/infrastructure/services/teacher-scope.service'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import { ForbiddenError, BadRequestError } from '../../../shared/domain/errors/app.errors'
import type { BulkAttendanceDto, CreateJustificationDto } from '../application/dtos/attendance.dto'

const repo = new PrismaAttendanceRepository()

/** Solo el tutor del paralelo (o staff privilegiado) puede tomar la asistencia diaria. */
async function assertCanTakeDailyAttendance(
  institutionId: string,
  userId: string,
  roles: string[],
  parallelId: string,
): Promise<void> {
  if (isPrivilegedStaff(roles)) return
  const parallel = await prisma.parallel.findFirst({
    where: { id: parallelId, institutionId },
    select: { tutorId: true },
  })
  if (parallel?.tutorId === userId) return
  throw new ForbiddenError()
}

export default async function attendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /attendance?courseAssignmentId=&date=  (materia)  ó  ?parallelId=&date=  (diaria)
  app.get<{ Querystring: { courseAssignmentId?: string; parallelId?: string; date: string } }>(
    '/attendance',
    async (req, reply) => {
      const { courseAssignmentId, parallelId, date } = req.query
      if (parallelId) {
        const result = await repo.getByParallelDate(req.user.institutionId, parallelId, date)
        return reply.status(200).send(result)
      }
      if (!courseAssignmentId) throw new BadRequestError('Se requiere courseAssignmentId o parallelId')
      const result = await repo.getByDate(req.user.institutionId, courseAssignmentId, date)
      return reply.status(200).send(result)
    },
  )

  // POST /attendance/bulk  (materia o diaria según parallelId)
  app.post<{ Body: BulkAttendanceDto }>(
    '/attendance/bulk',
    async (req, reply) => {
      if (req.body.parallelId) {
        await assertCanTakeDailyAttendance(
          req.user.institutionId,
          req.user.sub,
          req.user.roles,
          req.body.parallelId,
        )
        const result = await repo.bulkUpsertDaily(req.user.institutionId, req.body, req.user.sub)
        return reply.status(200).send(result)
      }
      const result = await repo.bulkUpsert(req.user.institutionId, req.body, req.user.sub)
      return reply.status(200).send(result)
    },
  )

  // GET /attendance/student/:studentId/summary?courseAssignmentId=
  app.get<{
    Params: { studentId: string }
    Querystring: { courseAssignmentId?: string }
  }>(
    '/attendance/student/:studentId/summary',
    async (req, reply) => {
      const { studentId } = req.params
      const { courseAssignmentId } = req.query
      const result = await repo.getStudentSummary(
        req.user.institutionId,
        studentId,
        courseAssignmentId,
      )
      return reply.status(200).send(result)
    },
  )

  // GET /attendance/student/:studentId/absences
  app.get<{ Params: { studentId: string } }>(
    '/attendance/student/:studentId/absences',
    async (req, reply) => {
      const result = await repo.getStudentAbsences(req.user.institutionId, req.params.studentId)
      return reply.status(200).send(result)
    },
  )

  // POST /attendance/justifications
  app.post<{ Body: CreateJustificationDto }>(
    '/attendance/justifications',
    async (req, reply) => {
      const result = await repo.createJustification(
        req.user.institutionId,
        req.body,
        req.user.sub,
      )
      return reply.status(201).send(result)
    },
  )
}
