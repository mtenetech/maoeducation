import { FastifyInstance } from 'fastify'
import { PrismaPedagogicRecoveryRepository } from '../infrastructure/repositories/prisma-pedagogic-recovery.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import type { PedagogicRecoveryQuery, SavePedagogicRecoveryDto } from '../application/dtos/pedagogic-recovery.dto'

const repo = new PrismaPedagogicRecoveryRepository()

export default async function pedagogicRecoveryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /pedagogic-recovery?parallelId=&periodId=&yearId=
  app.get<{ Querystring: PedagogicRecoveryQuery }>(
    '/pedagogic-recovery',
    { preHandler: [requirePermission('grades', 'read')] },
    async (req, reply) => {
      const result = await repo.getPage(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )

  // PUT /pedagogic-recovery  (upsert o borrar si score=null)
  app.put<{ Body: SavePedagogicRecoveryDto }>(
    '/pedagogic-recovery',
    { preHandler: [requirePermission('grades', 'write')] },
    async (req, reply) => {
      const result = await repo.save(req.user.institutionId, req.body, req.user.sub)
      return reply.send(result)
    },
  )
}
