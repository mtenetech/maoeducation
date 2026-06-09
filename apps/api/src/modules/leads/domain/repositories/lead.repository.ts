import { Lead } from '../entities/lead.entity'
import { CreateLeadDto } from '../../application/dtos/create-lead.dto'

export interface ILeadRepository {
  create(data: CreateLeadDto): Promise<Lead>
  list(): Promise<Lead[]>
}
