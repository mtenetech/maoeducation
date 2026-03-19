import { FastifyInstance } from 'fastify'
import { PrismaAttendanceRepository } from '../infrastructure/repositories/prisma-attendance.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import type { BulkAttendanceDto, CreateJustificationDto } from '../application/dtos/attendance.dto'

const repo = new PrismaAttendanceRepository()

export default async function attendanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /attendance?courseAssignmentId=&date=
  app.get<{ Querystring: { courseAssignmentId: string; date: string } }>(
    '/attendance',
    async (req, reply) => {
      const { courseAssignmentId, date } = req.query
      const result = await repo.getByDate(req.user.institutionId, courseAssignmentId, date)
      return reply.status(200).send(result)
    },
  )

  // POST /attendance/bulk
  app.post<{ Body: BulkAttendanceDto }>(
    '/attendance/bulk',
    async (req, reply) => {
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
