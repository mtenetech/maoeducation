import { FastifyInstance } from 'fastify'
import { PrismaPromotionRepository } from '../infrastructure/repositories/prisma-promotion.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import type { SaveDecisionDto, SaveRecoveryDto } from '../application/dtos/promotion.dto'

const repo = new PrismaPromotionRepository()

export default async function promotionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Params: { parallelId: string }; Querystring: { yearId: string } }>(
    '/parallels/:parallelId/promotion',
    { preHandler: [requirePermission('grades', 'read')] },
    async (req, reply) => {
      if (!req.query.yearId) return reply.status(400).send({ message: 'yearId es requerido' })
      return reply.send(
        await repo.getParallelPromotion(req.user.institutionId, req.params.parallelId, req.query.yearId),
      )
    },
  )

  app.put<{ Body: SaveRecoveryDto }>(
    '/promotion/recovery',
    { preHandler: [requirePermission('grades', 'write')] },
    async (req, reply) => {
      return reply.send(await repo.saveRecovery(req.user.institutionId, req.body, req.user.sub))
    },
  )

  app.put<{ Body: SaveDecisionDto }>(
    '/promotion/decision',
    { preHandler: [requirePermission('grades', 'write')] },
    async (req, reply) => {
      return reply.send(await repo.saveDecision(req.user.institutionId, req.body, req.user.sub))
    },
  )
}
