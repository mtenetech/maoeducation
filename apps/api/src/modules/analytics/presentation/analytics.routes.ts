import { FastifyInstance } from 'fastify'
import { prisma } from '../../../shared/infrastructure/database/prisma'

export default async function analyticsRoutes(app: FastifyInstance) {
  // POST /analytics/pageview — PÚBLICO (sin auth). Tracker propio de la landing auleka.com.
  app.post<{ Body: { path: string; referrer?: string; visitorId?: string } }>(
    '/analytics/pageview',
    {
      schema: {
        body: {
          type: 'object',
          required: ['path'],
          properties: {
            path: { type: 'string', minLength: 1, maxLength: 255 },
            referrer: { type: 'string', maxLength: 500 },
            visitorId: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async (req, reply) => {
      await prisma.pageView.create({
        data: {
          path: req.body.path,
          referrer: req.body.referrer,
          visitorId: req.body.visitorId,
        },
      })
      return reply.status(204).send()
    },
  )
}
