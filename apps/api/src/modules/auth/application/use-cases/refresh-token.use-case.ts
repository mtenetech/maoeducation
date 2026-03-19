import { IAuthUserRepository } from '../../domain/repositories/user.repository.interface'
import { RefreshResponseDto } from '../dtos/auth.dto'
import { TokenService } from '../../../../shared/infrastructure/services/token.service'
import { UnauthorizedError } from '../../../../shared/domain/errors/app.errors'

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IAuthUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<RefreshResponseDto> {
    const payload = this.tokenService.verifyRefresh(refreshToken)

    const user = await this.userRepo.findById(payload.sub)
    if (!user || !user.isActive) {
      throw new UnauthorizedError()
    }

    const userWithPerms = await this.userRepo.getWithPermissions(user.id)
    if (!userWithPerms) throw new UnauthorizedError()

    const accessToken = this.tokenService.signAccess({
      sub: user.id,
      institutionId: user.institutionId,
      roles: userWithPerms.roles,
      permissions: userWithPerms.permissions,
    })

    return { accessToken }
  }
}
