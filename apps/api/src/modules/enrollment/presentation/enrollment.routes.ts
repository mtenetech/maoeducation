import { FastifyInstance } from 'fastify'
import { PrismaEnrollmentRepository } from '../infrastructure/repositories/prisma-enrollment.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import type {
  CreateEnrollmentDto,
  BulkEnrollmentDto,
  UpdateEnrollmentStatusDto,
} from '../application/dtos/enrollment.dto'

const repo = new PrismaEnrollmentRepository()

export default async function enrollmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Querystring: { parallelId?: string; yearId?: string } }>(
    '/enrollments',
    { preHandler: [requirePermission('academic_config', 'read')] },
    async (req, reply) => {
      const enrollments = await repo.list(
        req.user.institutionId,
        req.query.parallelId,
        req.query.yearId,
      )
      return reply.send(enrollments)
    },
  )

  app.post<{ Body: CreateEnrollmentDto }>(
    '/enrollments',
    { preHandler: [requirePermission('academic_config', 'manage')] },
    async (req, reply) => {
      const enrollment = await repo.create(req.user.institutionId, req.body)
      return reply.status(201).send(enrollment)
    },
  )

  app.post<{ Body: BulkEnrollmentDto }>(
    '/enrollments/bulk',
    { preHandler: [requirePermission('academic_config', 'manage')] },
    async (req, reply) => {
      const result = await repo.bulkCreate(req.user.institutionId, req.body)
      return reply.status(201).send(result)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateEnrollmentStatusDto }>(
    '/enrollments/:id/status',
    { preHandler: [requirePermission('academic_config', 'manage')] },
    async (req, reply) => {
      const enrollment = await repo.updateStatus(req.params.id, req.user.institutionId, req.body)
      return reply.send(enrollment)
    },
  )
}
