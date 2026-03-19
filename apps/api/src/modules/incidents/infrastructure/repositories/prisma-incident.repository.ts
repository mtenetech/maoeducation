import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import type { CreateIncidentDto, UpdateIncidentDto, ListIncidentsQuery } from '../../application/dtos/incident.dto'

const includeRelations = {
  student: {
    select: {
      id: true,
      profile: {
        select: { firstName: true, lastName: true, dni: true },
      },
    },
  },
  reporter: {
    select: {
      id: true,
      profile: {
        select: { firstName: true, lastName: true },
      },
    },
  },
}

export class PrismaIncidentRepository {
  async list(institutionId: string, query: ListIncidentsQuery) {
    return prisma.disciplinaryIncident.findMany({
      where: {
        institutionId,
        ...(query.studentId && { studentId: query.studentId }),
        ...(query.status && { status: query.status }),
        ...(query.severity && { severity: query.severity }),
      },
      include: includeRelations,
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(institutionId: string, dto: CreateIncidentDto, reportedById: string) {
    const student = await prisma.user.findFirst({
      where: { id: dto.studentId, institutionId },
    })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    return prisma.disciplinaryIncident.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        reportedBy: reportedById,
        incidentDate: new Date(dto.incidentDate),
        category: dto.category,
        description: dto.description,
        severity: dto.severity ?? 'low',
      },
      include: includeRelations,
    })
  }

  async update(id: string, institutionId: string, dto: UpdateIncidentDto) {
    const existing = await prisma.disciplinaryIncident.findFirst({
      where: { id, institutionId },
    })
    if (!existing) throw new NotFoundError('Incidente no encontrado')

    return prisma.disciplinaryIncident.update({
      where: { id },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.resolutionNotes !== undefined && { resolutionNotes: dto.resolutionNotes }),
        ...(dto.status === 'resolved' && { resolvedAt: new Date() }),
      },
      include: includeRelations,
    })
  }

  async getById(id: string, institutionId: string) {
    const incident = await prisma.disciplinaryIncident.findFirst({
      where: { id, institutionId },
      include: includeRelations,
    })
    if (!incident) throw new NotFoundError('Incidente no encontrado')
    return incident
  }
}
