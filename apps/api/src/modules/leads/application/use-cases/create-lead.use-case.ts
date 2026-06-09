import { ILeadRepository } from '../../domain/repositories/lead.repository'
import { Lead } from '../../domain/entities/lead.entity'
import { CreateLeadDto } from '../dtos/create-lead.dto'
import { ValidationError } from '../../../../shared/domain/errors/app.errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class CreateLeadUseCase {
  constructor(private readonly repo: ILeadRepository) {}

  async execute(input: CreateLeadDto): Promise<Lead> {
    const name = input.name?.trim()
    const email = input.email?.trim().toLowerCase()

    if (!name || name.length < 2) {
      throw new ValidationError('El nombre es obligatorio')
    }
    if (!email || !EMAIL_RE.test(email)) {
      throw new ValidationError('El correo no es válido')
    }

    return this.repo.create({
      ...input,
      name,
      email,
      // TODO: notificar al equipo de ventas (email/WhatsApp) cuando se integre un proveedor.
    })
  }
}
