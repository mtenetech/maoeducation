import { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import { env } from '../../../config/env'

export default async function pushRoutes(app: FastifyInstance) {
  // Clave pública VAPID — pública, sin auth (el SW la necesita antes del login)
  app.get('/push/vapid-public-key', async (_req, reply) => {
    return reply.send({ publicKey: env.VAPID_PUBLIC_KEY ?? null })
  })

  app.addHook('preHandler', authMiddleware)

  // POST /push/subscribe — registra o actualiza una suscripción push
  app.post<{ Body: { endpoint: string; keys: { p256dh: string; auth: string } } }>(
    '/push/subscribe',
    async (req, reply) => {
      const { endpoint, keys } = req.body
      await prisma.pushSubscription.upsert({
        where: { userId_endpoint: { userId: req.user.sub, endpoint } },
        update: { p256dh: keys.p256dh, auth: keys.auth },
        create: { userId: req.user.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      })
      return reply.send({ ok: true })
    },
  )

  // DELETE /push/subscribe — elimina la suscripción de este dispositivo
  app.delete<{ Body: { endpoint: string } }>(
    '/push/subscribe',
    async (req, reply) => {
      await prisma.pushSubscription.deleteMany({
        where: { userId: req.user.sub, endpoint: req.body.endpoint },
      })
      return reply.send({ ok: true })
    },
  )
}
