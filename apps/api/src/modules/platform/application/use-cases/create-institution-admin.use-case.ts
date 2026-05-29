import { IPlatformRepository } from '../../domain/repositories/platform.repository.interface'
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/app.errors'
import { CreateInstitutionAdminInput, InstitutionAdminDto } from '../dtos/platform.dto'

export class CreateInstitutionAdminUseCase {
  constructor(private readonly repo: IPlatformRepository) {}

  async execute(institutionId: string, dto: CreateInstitutionAdminInput): Promise<InstitutionAdminDto> {
    const institution = await this.repo.findInstitutionById(institutionId)
    if (!institution) throw new NotFoundError('Institución no encontrada')

    const email = dto.email.trim().toLowerCase()
    if (await this.repo.emailExistsInInstitution(institutionId, email)) {
      throw new ConflictError(`Ya existe un usuario con el email "${email}" en esta institución`)
    }

    return this.repo.createInstitutionAdmin(institutionId, { ...dto, email })
  }
}
