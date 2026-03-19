import { FastifyInstance } from 'fastify'
import { PrismaIncidentRepository } from '../infrastructure/repositories/prisma-incident.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import type { CreateIncidentDto, UpdateIncidentDto, ListIncidentsQuery } from '../application/dtos/incident.dto'

const repo = new PrismaIncidentRepository()

export default async function incidentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /incidents
  app.get<{ Querystring: ListIncidentsQuery }>(
    '/incidents',
    async (req, reply) => {
      const result = await repo.list(req.user.institutionId, req.query)
      return reply.status(200).send(result)
    },
  )

  // POST /incidents
  app.post<{ Body: CreateIncidentDto }>(
    '/incidents',
    async (req, reply) => {
      const result = await repo.create(req.user.institutionId, req.body, req.user.sub)
      return reply.code(201).send(result)
    },
  )

  // GET /incidents/:id
  app.get<{ Params: { id: string } }>(
    '/incidents/:id',
    async (req, reply) => {
      const result = await repo.getById(req.params.id, req.user.institutionId)
      return reply.status(200).send(result)
    },
  )

  // PATCH /incidents/:id
  app.patch<{ Params: { id: string }; Body: UpdateIncidentDto }>(
    '/incidents/:id',
    async (req, reply) => {
      const result = await repo.update(req.params.id, req.user.institutionId, req.body)
      return reply.status(200).send(result)
    },
  )
}
