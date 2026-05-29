import { Prisma } from '@prisma/client'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import {
  InstitutionBranding,
  InstitutionSettingsDto,
  UpdateInstitutionSettingsDto,
} from '../../application/dtos/institution.dto'

function extractBranding(settings: unknown): InstitutionBranding {
  const s = (settings ?? {}) as Record<string, unknown>
  const branding = (s.branding ?? {}) as Record<string, unknown>
  return {
    logoUrl: (branding.logoUrl as string | undefined) ?? null,
    primaryColor: (branding.primaryColor as string | undefined) ?? null,
    sidebarColor: (branding.sidebarColor as string | undefined) ?? null,
  }
}

export class PrismaInstitutionRepository {
  async getSettings(institutionId: string): Promise<InstitutionSettingsDto> {
    const inst = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true, code: true, settings: true },
    })
    if (!inst) throw new NotFoundError('Institución no encontrada')
    return {
      id: inst.id,
      name: inst.name,
      code: inst.code,
      branding: extractBranding(inst.settings),
    }
  }

  async updateSettings(
    institutionId: string,
    dto: UpdateInstitutionSettingsDto,
  ): Promise<InstitutionSettingsDto> {
    const inst = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    })
    if (!inst) throw new NotFoundError('Institución no encontrada')

    const currentSettings = (inst.settings ?? {}) as Record<string, unknown>
    const currentBranding = extractBranding(inst.settings)

    const nextBranding: InstitutionBranding = dto.branding
      ? { ...currentBranding, ...dto.branding }
      : currentBranding

    const updated = await prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        settings: { ...currentSettings, branding: nextBranding } as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, code: true, settings: true },
    })

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      branding: extractBranding(updated.settings),
    }
  }

  /** Guarda solo el logoUrl dentro de branding (tras subir el archivo). */
  async setLogoUrl(institutionId: string, logoUrl: string): Promise<string> {
    const inst = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    })
    if (!inst) throw new NotFoundError('Institución no encontrada')
    const currentSettings = (inst.settings ?? {}) as Record<string, unknown>
    const currentBranding = extractBranding(inst.settings)
    await prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: {
          ...currentSettings,
          branding: { ...currentBranding, logoUrl },
        } as unknown as Prisma.InputJsonValue,
      },
    })
    return logoUrl
  }
}
