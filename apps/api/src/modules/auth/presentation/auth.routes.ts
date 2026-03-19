import { FastifyInstance } from 'fastify'
import { authController } from './controllers/auth.controller'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { loginSchema } from './validators/auth.schema'

export default async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'institutionCode'],
          properties: {
            email:           { type: 'string', format: 'email' },
            password:        { type: 'string', minLength: 1 },
            institutionCode: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    authController.login,
  )

  app.post('/auth/refresh', authController.refresh)
  app.post('/auth/logout', authController.logout)

  app.get(
    '/auth/me',
    { preHandler: [authMiddleware] },
    authController.me,
  )
}
