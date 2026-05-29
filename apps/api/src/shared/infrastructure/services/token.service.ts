import jwt from 'jsonwebtoken'
import { env } from '../../../config/env'
import { UnauthorizedError } from '../../domain/errors/app.errors'

export interface AccessTokenPayload {
  sub: string
  institutionId: string
  roles: string[]
  permissions: string[]
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  iat?: number
  exp?: number
}

// Token del superadmin de plataforma — NO atado a ninguna institución
export interface PlatformTokenPayload {
  sub: string
  scope: 'platform'
  iat?: number
  exp?: number
}

export class TokenService {
  signAccess(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
    })
  }

  signRefresh(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
    })
  }

  verifyAccess(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
    } catch {
      throw new UnauthorizedError('Token inválido o expirado')
    }
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
    } catch {
      throw new UnauthorizedError('Refresh token inválido o expirado')
    }
  }

  signPlatformAccess(payload: { sub: string }): string {
    return jwt.sign({ ...payload, scope: 'platform' }, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
    })
  }

  verifyPlatformAccess(token: string): PlatformTokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as PlatformTokenPayload
      if (payload.scope !== 'platform') {
        throw new UnauthorizedError('Token inválido o expirado')
      }
      return payload
    } catch {
      throw new UnauthorizedError('Token inválido o expirado')
    }
  }
}

export const tokenService = new TokenService()
