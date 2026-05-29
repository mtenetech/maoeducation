import { FastifyInstance } from 'fastify'
import { PrismaBehaviorRepository } from '../infrastructure/repositories/prisma-behavior.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import type { SaveBehaviorDto } from '../application/dtos/behavior.dto'

const repo = new PrismaBehaviorRepository()

export default async function behaviorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Params: { parallelId: string }; Querystring: { periodId: string } }>(
    '/parallels/:parallelId/behavior',
    { preHandler: [requirePermission('grades', 'read')] },
    async (req, reply) => {
      if (!req.query.periodId) return reply.status(400).send({ message: 'periodId es requerido' })
      return reply.send(
        await repo.listByParallelPeriod(req.user.institutionId, req.params.parallelId, req.query.periodId),
      )
    },
  )

  app.put<{ Body: SaveBehaviorDto }>(
    '/behavior',
    { preHandler: [requirePermission('grades', 'write')] },
    async (req, reply) => {
      return reply.send(await repo.bulkSave(req.user.institutionId, req.body, req.user.sub))
    },
  )
}
