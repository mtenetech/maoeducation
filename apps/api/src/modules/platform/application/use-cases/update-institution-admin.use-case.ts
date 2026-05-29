import { IPlatformRepository } from '../../domain/repositories/platform.repository.interface'
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/app.errors'
import { InstitutionAdminDto, UpdateInstitutionAdminDto } from '../dtos/platform.dto'

export class UpdateInstitutionAdminUseCase {
  constructor(private readonly repo: IPlatformRepository) {}

  async execute(
    institutionId: string,
    userId: string,
    dto: UpdateInstitutionAdminDto,
  ): Promise<InstitutionAdminDto> {
    const existing = await this.repo.findInstitutionAdmin(institutionId, userId)
    if (!existing) throw new NotFoundError('Administrador no encontrado en esta institución')

    const patch: UpdateInstitutionAdminDto = { ...dto }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase()
      if (await this.repo.emailExistsInInstitution(institutionId, email, userId)) {
        throw new ConflictError(`Ya existe un usuario con el email "${email}" en esta institución`)
      }
      patch.email = email
    }

    return this.repo.updateInstitutionAdmin(userId, patch)
  }
}
