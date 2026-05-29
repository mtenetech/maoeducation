import { Prisma } from '@prisma/client'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/app.errors'
import type {
  CreateTemplateDto,
  SaveAnamnesisDto,
  UpdateTemplateDto,
} from '../../application/dtos/anamnesis.dto'

export class PrismaAnamnesisRepository {
  // ─── Plantillas ─────────────────────────────────────────────────────────
  listTemplates(institutionId: string) {
    return prisma.anamnesisTemplate.findMany({
      where: { institutionId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  async getDefaultTemplate(institutionId: string) {
    const t =
      (await prisma.anamnesisTemplate.findFirst({
        where: { institutionId, isDefault: true, isActive: true },
      })) ??
      (await prisma.anamnesisTemplate.findFirst({ where: { institutionId, isActive: true } }))
    if (!t) throw new NotFoundError('No hay plantilla de anamnesis configurada')
    return t
  }

  createTemplate(institutionId: string, dto: CreateTemplateDto) {
    return prisma.anamnesisTemplate.create({
      data: {
        institutionId,
        name: dto.name,
        schema: dto.schema as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async updateTemplate(id: string, institutionId: string, dto: UpdateTemplateDto) {
    const t = await prisma.anamnesisTemplate.findFirst({ where: { id, institutionId } })
    if (!t) throw new NotFoundError('Plantilla no encontrada')

    // Si se marca como default, desmarcar las demás
    if (dto.isDefault) {
      await prisma.anamnesisTemplate.updateMany({
        where: { institutionId, id: { not: id } },
        data: { isDefault: false },
      })
    }

    return prisma.anamnesisTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.schema !== undefined && { schema: dto.schema as unknown as Prisma.InputJsonValue }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    })
  }

  // ─── Respuestas por estudiante ────────────────────────────────────────────
  async getStudentAnamnesis(studentId: string, institutionId: string) {
    const student = await prisma.user.findFirst({ where: { id: studentId, institutionId } })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    const record = await prisma.anamnesisRecord.findUnique({
      where: { studentId },
      include: { template: true },
    })

    // Plantilla a usar: la del record o la default
    const template = record?.template ?? (await this.getDefaultTemplate(institutionId))
    return { template, record }
  }

  async saveStudentAnamnesis(
    studentId: string,
    institutionId: string,
    actorId: string,
    dto: SaveAnamnesisDto,
  ) {
    const student = await prisma.user.findFirst({ where: { id: studentId, institutionId } })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    const templateId = dto.templateId ?? (await this.getDefaultTemplate(institutionId)).id
    const answers = dto.answers as unknown as Prisma.InputJsonValue

    return prisma.anamnesisRecord.upsert({
      where: { studentId },
      update: { answers, templateId },
      create: { studentId, institutionId, templateId, answers, createdBy: actorId },
      include: { template: true },
    })
  }
}
