import { FastifyInstance } from 'fastify'
import { PrismaAnamnesisRepository } from '../infrastructure/repositories/prisma-anamnesis.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { assertStudentFichaAccess } from '../../../shared/infrastructure/services/teacher-scope.service'
import type {
  CreateTemplateDto,
  SaveAnamnesisDto,
  UpdateTemplateDto,
} from '../application/dtos/anamnesis.dto'

const repo = new PrismaAnamnesisRepository()

export default async function anamnesisRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // ─── Plantillas ─────────────────────────────────────────────────────────
  app.get(
    '/anamnesis/templates',
    { preHandler: [requirePermission('anamnesis', 'read')] },
    async (req, reply) => reply.send(await repo.listTemplates(req.user.institutionId)),
  )

  app.get(
    '/anamnesis/templates/default',
    { preHandler: [requirePermission('anamnesis', 'read')] },
    async (req, reply) => reply.send(await repo.getDefaultTemplate(req.user.institutionId)),
  )

  app.post<{ Body: CreateTemplateDto }>(
    '/anamnesis/templates',
    { preHandler: [requirePermission('anamnesis', 'manage', 'all')] },
    async (req, reply) =>
      reply.status(201).send(await repo.createTemplate(req.user.institutionId, req.body)),
  )

  app.put<{ Params: { id: string }; Body: UpdateTemplateDto }>(
    '/anamnesis/templates/:id',
    { preHandler: [requirePermission('anamnesis', 'manage', 'all')] },
    async (req, reply) =>
      reply.send(await repo.updateTemplate(req.params.id, req.user.institutionId, req.body)),
  )

  // ─── Respuestas por estudiante ────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/students/:id/anamnesis',
    { preHandler: [requirePermission('anamnesis', 'read')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      return reply.send(await repo.getStudentAnamnesis(req.params.id, req.user.institutionId))
    },
  )

  app.put<{ Params: { id: string }; Body: SaveAnamnesisDto }>(
    '/students/:id/anamnesis',
    { preHandler: [requirePermission('anamnesis', 'manage')] },
    async (req, reply) => {
      await assertStudentFichaAccess(req, req.params.id)
      return reply.send(
        await repo.saveStudentAnamnesis(req.params.id, req.user.institutionId, req.user.sub, req.body),
      )
    },
  )
}
