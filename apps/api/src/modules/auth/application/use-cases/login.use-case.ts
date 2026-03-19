import bcrypt from 'bcryptjs'
import { IAuthUserRepository } from '../../domain/repositories/user.repository.interface'
import { LoginDto, LoginResponseDto } from '../dtos/auth.dto'
import { TokenService } from '../../../../shared/infrastructure/services/token.service'
import { UnauthorizedError } from '../../../../shared/domain/errors/app.errors'
import { prisma } from '../../../../shared/infrastructure/database/prisma'

export class LoginUseCase {
  constructor(
    private readonly userRepo: IAuthUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResponseDto> {
    // Buscar institución por código
    const institution = await prisma.institution.findUnique({
      where: { code: dto.institutionCode },
      select: { id: true, isActive: true },
    })

    if (!institution || !institution.isActive) {
      throw new UnauthorizedError('Institución no encontrada o inactiva')
    }

    const user = await this.userRepo.findByEmail(dto.email, institution.id)

    // Mensaje genérico para no revelar si el email existe
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Credenciales inválidas')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales inválidas')
    }

    const userWithPerms = await this.userRepo.getWithPermissions(user.id)
    if (!userWithPerms) throw new UnauthorizedError('Credenciales inválidas')

    const accessToken = this.tokenService.signAccess({
      sub: user.id,
      institutionId: user.institutionId,
      roles: userWithPerms.roles,
      permissions: userWithPerms.permissions,
    })

    const refreshToken = this.tokenService.signRefresh({ sub: user.id })

    await this.userRepo.updateLastLogin(user.id)

    const [tutoredParallels] = await Promise.all([
      prisma.parallel.findMany({
        where: { tutorId: user.id },
        select: { id: true },
      }),
    ])

    const fullName = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.email

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName,
        avatarUrl: user.profile?.avatarUrl ?? null,
        roles: userWithPerms.roles,
        permissions: userWithPerms.permissions,
        institutionId: user.institutionId,
        tutorParallelIds: tutoredParallels.map((p) => p.id),
      },
    }
  }
}
