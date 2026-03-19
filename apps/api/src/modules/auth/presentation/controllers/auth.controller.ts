import { FastifyRequest, FastifyReply } from 'fastify'
import { LoginUseCase } from '../../application/use-cases/login.use-case'
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case'
import { PrismaAuthUserRepository } from '../../infrastructure/repositories/prisma-auth-user.repository'
import { tokenService } from '../../../../shared/infrastructure/services/token.service'
import { LoginBody } from '../validators/auth.schema'
import { UnauthorizedError } from '../../../../shared/domain/errors/app.errors'

const userRepo = new PrismaAuthUserRepository()
const loginUseCase = new LoginUseCase(userRepo, tokenService)
const refreshUseCase = new RefreshTokenUseCase(userRepo, tokenService)

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 60 * 60 * 24 * 7, // 7 días en segundos
}

export const authController = {
  async login(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const result = await loginUseCase.execute(req.body)

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)

    return reply.send({
      accessToken: result.accessToken,
      user: result.user,
    })
  },

  async refresh(req: FastifyRequest, reply: FastifyReply) {
    const refreshToken = req.cookies[REFRESH_COOKIE]
    if (!refreshToken) throw new UnauthorizedError('Refresh token no encontrado')

    const result = await refreshUseCase.execute(refreshToken)

    return reply.send(result)
  },

  async logout(_req: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
    return reply.status(204).send()
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    const user = await userRepo.getWithPermissions(req.user.sub)
    if (!user) throw new UnauthorizedError()

    const fullName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.email

    return reply.send({
      id: user.id,
      email: user.email,
      fullName,
      avatarUrl: user.profile?.avatarUrl ?? null,
      roles: user.roles,
      permissions: user.permissions,
      institutionId: user.institutionId,
    })
  },
}
