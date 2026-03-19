import { FastifyInstance } from 'fastify'
import { PrismaScheduleRepository } from '../infrastructure/repositories/prisma-schedule.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import type {
  CreateScheduleEntryDto,
  UpdateScheduleEntryDto,
  GetScheduleQuery,
} from '../application/dtos/schedule.dto'

const repo = new PrismaScheduleRepository()

export default async function scheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /schedules
  app.get<{ Querystring: GetScheduleQuery }>(
    '/schedules',
    async (req, reply) => {
      const result = await repo.getSchedule(req.user.institutionId, req.query)
      return reply.status(200).send(result)
    },
  )

  // POST /schedules
  app.post<{ Body: CreateScheduleEntryDto }>(
    '/schedules',
    async (req, reply) => {
      const result = await repo.create(req.user.institutionId, req.body)
      return reply.code(201).send(result)
    },
  )

  // PATCH /schedules/:id
  app.patch<{ Params: { id: string }; Body: UpdateScheduleEntryDto }>(
    '/schedules/:id',
    async (req, reply) => {
      const result = await repo.update(req.params.id, req.user.institutionId, req.body)
      return reply.status(200).send(result)
    },
  )

  // DELETE /schedules/:id
  app.delete<{ Params: { id: string } }>(
    '/schedules/:id',
    async (req, reply) => {
      await repo.delete(req.params.id, req.user.institutionId)
      return reply.code(204).send()
    },
  )
}
