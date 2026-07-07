import { IAuthUserRepository } from '../../../auth/domain/repositories/user.repository.interface'
import { TokenService } from '../../../../shared/infrastructure/services/token.service'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { buildAuthInstitution } from '../../../auth/application/services/auth-institution.mapper'
import { LoginResponseDto } from '../../../auth/application/dtos/auth.dto'

export class ImpersonateUserUseCase {
  constructor(
    private readonly userRepo: IAuthUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(targetUserId: string): Promise<LoginResponseDto> {
    const user = await this.userRepo.getWithPermissions(targetUserId)
    if (!user || !user.isActive) throw new NotFoundError('Usuario no encontrado')

    const institution = await prisma.institution.findUnique({
      where: { id: user.institutionId },
      select: { id: true, name: true, settings: true },
    })
    if (!institution) throw new NotFoundError('Usuario no encontrado')

    const accessToken = this.tokenService.signAccess({
      sub: user.id,
      institutionId: user.institutionId,
      roles: user.roles,
      permissions: user.permissions,
    })
    const refreshToken = this.tokenService.signRefresh({ sub: user.id })

    const tutoredParallels = await prisma.parallel.findMany({
      where: { tutorId: user.id },
      select: { id: true },
    })

    const fullName = user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName,
        avatarUrl: user.profile?.avatarUrl ?? null,
        roles: user.roles,
        permissions: user.permissions,
        institutionId: user.institutionId,
        institution: buildAuthInstitution(institution),
        tutorParallelIds: tutoredParallels.map((p) => p.id),
      },
    }
  }
}
