import path from 'path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import fp from 'fastify-plugin'
import { env } from './config/env'
import { errorPlugin } from './shared/infrastructure/plugins/error.plugin'
import { registerRoutes } from './shared/infrastructure/routes'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    genReqId: () => crypto.randomUUID(),
  })

  // Security
  app.register(helmet, { contentSecurityPolicy: false })

  // CORS — en producción configurar orígenes específicos
  app.register(cors, {
    origin: env.NODE_ENV === 'development' ? true : process.env.FRONTEND_URL,
    credentials: true,
  })

  // Cookies (para refresh token)
  app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
  })

  // File uploads (max 10 MB)
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  // Serve uploaded files
  app.register(staticFiles, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  })

  // Error handler global
  app.register(fp(errorPlugin))

  // Rutas
  app.register(registerRoutes)

  return app
}
