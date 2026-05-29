import { FastifyRequest, FastifyReply } from 'fastify'
import { tokenService, PlatformTokenPayload } from '../services/token.service'
import { UnauthorizedError } from '../../domain/errors/app.errors'

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    platformAdmin: PlatformTokenPayload
  }
}

export async function platformAuthMiddleware(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const token = authHeader.slice(7)
  req.platformAdmin = tokenService.verifyPlatformAccess(token)
}
