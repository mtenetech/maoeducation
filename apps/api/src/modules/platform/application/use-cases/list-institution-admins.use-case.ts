import { IPlatformRepository } from '../../domain/repositories/platform.repository.interface'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import { InstitutionAdminDto } from '../dtos/platform.dto'

export class ListInstitutionAdminsUseCase {
  constructor(private readonly repo: IPlatformRepository) {}

  async execute(institutionId: string): Promise<InstitutionAdminDto[]> {
    const institution = await this.repo.findInstitutionById(institutionId)
    if (!institution) throw new NotFoundError('Institución no encontrada')

    return this.repo.listInstitutionAdmins(institutionId)
  }
}
