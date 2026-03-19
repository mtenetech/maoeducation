import { FastifyRequest, FastifyReply } from 'fastify'
import { tokenService, AccessTokenPayload } from '../services/token.service'
import { UnauthorizedError } from '../../domain/errors/app.errors'

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    user: AccessTokenPayload
  }
}

export async function authMiddleware(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const token = authHeader.slice(7)
  req.user = tokenService.verifyAccess(token)
}
