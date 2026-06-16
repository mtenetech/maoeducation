import { FastifyInstance } from 'fastify'
import { PrismaGuardianRepository } from '../infrastructure/repositories/prisma-guardian.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { assertStudentFichaAccess } from '../../../shared/infrastructure/services/teacher-scope.service'
import { getGuardianChildren } from '../../../shared/infrastructure/services/guardian-scope.service'
import type { CreateGuardianDto, UpdateGuardianLinkDto } from '../application/dtos/guardian.dto'

const repo = new PrismaGuardianRepository()

export default async function guardianRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /guardian/my-students — lista de hijos del representante autenticado
  app.get('/guardian/my-students', async (req, reply) => {
    const children = await getGuardianChildren(req.user.sub)
    return reply.send(children)
  })

  app.get<{ Params: { id: string } }>(
    '/students/:id/guardians',
    { preHandler: [requirePermission('users', 'read')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      return reply.send(await repo.list(req.params.id, req.user.institutionId))
    },
  )

  app.post<{ Params: { id: string }; Body: CreateGuardianDto }>(
    '/students/:id/guardians',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      return reply.status(201).send(await repo.create(req.params.id, req.user.institutionId, req.body))
    },
  )

  app.patch<{ Params: { id: string; guardianId: string }; Body: UpdateGuardianLinkDto }>(
    '/students/:id/guardians/:guardianId',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      return reply.send(
        await repo.updateLink(req.params.id, req.params.guardianId, req.user.institutionId, req.body),
      )
    },
  )

  app.delete<{ Params: { id: string; guardianId: string } }>(
    '/students/:id/guardians/:guardianId',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      await repo.unlink(req.params.id, req.params.guardianId, req.user.institutionId)
      return reply.status(204).send()
    },
  )
}
