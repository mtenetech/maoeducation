import { IPlatformRepository } from '../../domain/repositories/platform.repository.interface'
import { InstitutionListItemDto } from '../dtos/platform.dto'

export class ListInstitutionsUseCase {
  constructor(private readonly repo: IPlatformRepository) {}

  execute(): Promise<InstitutionListItemDto[]> {
    return this.repo.listInstitutions()
  }
}
