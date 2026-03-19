import { FastifyInstance } from 'fastify'
import { PrismaReportRepository } from '../infrastructure/prisma-report.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import type { GradesReportQuery, AttendanceReportQuery, EnrollmentReportQuery } from '../application/dtos/report.dto'

const repo = new PrismaReportRepository()

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Querystring: GradesReportQuery }>(
    '/reports/grades',
    async (req, reply) => {
      const result = await repo.getGradesReport(req.user.institutionId, req.query, {
        userId: req.user.sub,
        roles: req.user.roles,
      })
      return reply.send(result)
    },
  )

  app.get<{ Querystring: AttendanceReportQuery }>(
    '/reports/attendance',
    async (req, reply) => {
      const result = await repo.getAttendanceReport(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )

  // GET /reports/my-grades?periodId=X  — student/guardian: all subjects compact grades
  app.get<{ Querystring: { periodId: string } }>('/reports/my-grades', async (req, reply) => {
    const { sub: userId, institutionId, roles } = req.user
    let studentId = userId
    if (roles.includes('guardian')) {
      const link = await prisma.guardianStudent.findFirst({
        where: { guardianId: userId },
        select: { studentId: true },
      })
      if (link) studentId = link.studentId
    }
    const result = await repo.getMyGrades(institutionId, studentId, req.query.periodId)
    return reply.send(result)
  })

  app.get<{ Querystring: EnrollmentReportQuery }>(
    '/reports/enrollment',
    async (req, reply) => {
      const result = await repo.getEnrollmentReport(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )
}
