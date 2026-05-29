import { IPlatformRepository } from '../../domain/repositories/platform.repository.interface'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import { InstitutionListItemDto } from '../dtos/platform.dto'

export class ToggleInstitutionUseCase {
  constructor(private readonly repo: IPlatformRepository) {}

  async execute(id: string): Promise<InstitutionListItemDto> {
    const institution = await this.repo.findInstitutionById(id)
    if (!institution) throw new NotFoundError('Institución no encontrada')

    return this.repo.setInstitutionActive(id, !institution.isActive)
  }
}
