import { Prisma } from '@prisma/client'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/app.errors'
import type {
  AddEventDto,
  AssignDeceDto,
  ChangeStateDto,
  CreateCommitmentDto,
  CreateIncidentDto,
  CreateIncidentTypeDto,
  ListIncidentsQuery,
  UpdateIncidentDto,
  UpdateIncidentTypeDto,
} from '../../application/dtos/incident.dto'

const personSelect = {
  id: true,
  profile: { select: { firstName: true, lastName: true, dni: true } },
}

const listRelations = {
  student: { select: personSelect },
  reporter: { select: personSelect },
  incidentType: { select: { id: true, name: true, severity: true } },
  assignedDece: { select: personSelect },
}

const detailRelations = {
  ...listRelations,
  events: {
    orderBy: { createdAt: 'asc' as const },
    include: { actor: { select: personSelect } },
  },
  commitments: {
    orderBy: { createdAt: 'desc' as const },
    include: { creator: { select: personSelect } },
  },
  attachments: {
    orderBy: { createdAt: 'desc' as const },
    include: { uploader: { select: personSelect } },
  },
}

export class PrismaIncidentRepository {
  // ─── Incidentes (caso) ──────────────────────────────────────────────────

  async list(institutionId: string, query: ListIncidentsQuery) {
    return prisma.disciplinaryIncident.findMany({
      where: {
        institutionId,
        ...(query.studentId && { studentId: query.studentId }),
        ...(query.status && { status: query.status }),
        ...(query.severity && { severity: query.severity }),
        ...(query.workflowState && { workflowState: query.workflowState }),
      },
      include: listRelations,
      orderBy: { createdAt: 'desc' },
    })
  }

  async create(institutionId: string, dto: CreateIncidentDto, reportedById: string) {
    const student = await prisma.user.findFirst({ where: { id: dto.studentId, institutionId } })
    if (!student) throw new NotFoundError('Estudiante no encontrado')

    return prisma.$transaction(async (tx) => {
      const incident = await tx.disciplinaryIncident.create({
        data: {
          institutionId,
          studentId: dto.studentId,
          reportedBy: reportedById,
          incidentTypeId: dto.incidentTypeId ?? null,
          incidentDate: new Date(dto.incidentDate),
          category: dto.category,
          description: dto.description,
          severity: dto.severity ?? 'leve',
        },
        include: detailRelations,
      })
      await tx.incidentEvent.create({
        data: {
          incidentId: incident.id,
          institutionId,
          actorId: reportedById,
          type: 'created',
          description: 'Incidente reportado',
        },
      })
      return incident
    })
  }

  async update(id: string, institutionId: string, dto: UpdateIncidentDto) {
    await this.ensureExists(id, institutionId)
    return prisma.disciplinaryIncident.update({
      where: { id },
      data: {
        ...(dto.incidentTypeId !== undefined && { incidentTypeId: dto.incidentTypeId }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.resolutionNotes !== undefined && { resolutionNotes: dto.resolutionNotes }),
        ...(dto.status === 'resolved' && { resolvedAt: new Date() }),
      },
      include: detailRelations,
    })
  }

  async getById(id: string, institutionId: string) {
    const incident = await prisma.disciplinaryIncident.findFirst({
      where: { id, institutionId },
      include: detailRelations,
    })
    if (!incident) throw new NotFoundError('Incidente no encontrado')
    return incident
  }

  async changeState(id: string, institutionId: string, actorId: string, dto: ChangeStateDto) {
    await this.ensureExists(id, institutionId)
    return prisma.$transaction(async (tx) => {
      const incident = await tx.disciplinaryIncident.update({
        where: { id },
        data: {
          workflowState: dto.workflowState,
          ...(dto.workflowState === 'resuelto' && { resolvedAt: new Date() }),
        },
        include: detailRelations,
      })
      await tx.incidentEvent.create({
        data: {
          incidentId: id,
          institutionId,
          actorId,
          type: 'state_changed',
          description: dto.note ?? `Estado cambiado a "${dto.workflowState}"`,
          metadata: { workflowState: dto.workflowState },
        },
      })
      return incident
    })
  }

  async assignDece(id: string, institutionId: string, actorId: string, dto: AssignDeceDto) {
    await this.ensureExists(id, institutionId)
    const dece = await prisma.user.findFirst({
      where: { id: dto.deceId, institutionId },
      include: { profile: { select: { firstName: true, lastName: true } } },
    })
    if (!dece) throw new NotFoundError('Profesional DECE no encontrado')

    return prisma.$transaction(async (tx) => {
      const incident = await tx.disciplinaryIncident.update({
        where: { id },
        data: {
          assignedDeceId: dto.deceId,
          assignedDeceAt: new Date(),
          workflowState: 'derivado_dece',
        },
        include: detailRelations,
      })
      const name = dece.profile ? `${dece.profile.firstName} ${dece.profile.lastName}` : 'DECE'
      await tx.incidentEvent.create({
        data: {
          incidentId: id,
          institutionId,
          actorId,
          type: 'dece_assigned',
          description: dto.note ?? `Caso derivado al DECE (${name})`,
          metadata: { deceId: dto.deceId },
        },
      })
      return incident
    })
  }

  async addEvent(id: string, institutionId: string, actorId: string, dto: AddEventDto) {
    await this.ensureExists(id, institutionId)
    return prisma.incidentEvent.create({
      data: { incidentId: id, institutionId, actorId, type: 'note', description: dto.description },
      include: { actor: { select: personSelect } },
    })
  }

  async listEvents(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId)
    return prisma.incidentEvent.findMany({
      where: { incidentId: id },
      include: { actor: { select: personSelect } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async markGuardianNotified(id: string, institutionId: string, actorId: string, summary: string) {
    return prisma.$transaction(async (tx) => {
      await tx.disciplinaryIncident.update({
        where: { id },
        data: { guardianNotifiedAt: new Date() },
      })
      await tx.incidentEvent.create({
        data: { incidentId: id, institutionId, actorId, type: 'guardian_notified', description: summary },
      })
    })
  }

  // ─── Actas de compromiso ────────────────────────────────────────────────

  async createCommitment(id: string, institutionId: string, actorId: string, dto: CreateCommitmentDto) {
    await this.ensureExists(id, institutionId)
    return prisma.$transaction(async (tx) => {
      const commitment = await tx.incidentCommitment.create({
        data: {
          incidentId: id,
          institutionId,
          terms: dto.terms,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
          signatories: (dto.signatories ?? {}) as Prisma.InputJsonValue,
          createdBy: actorId,
        },
        include: { creator: { select: personSelect } },
      })
      await tx.incidentEvent.create({
        data: {
          incidentId: id,
          institutionId,
          actorId,
          type: 'commitment_created',
          description: 'Acta de compromiso creada',
          metadata: { commitmentId: commitment.id },
        },
      })
      return commitment
    })
  }

  async listCommitments(id: string, institutionId: string) {
    await this.ensureExists(id, institutionId)
    return prisma.incidentCommitment.findMany({
      where: { incidentId: id },
      include: { creator: { select: personSelect } },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Carga el acta + datos necesarios para el PDF. */
  async getCommitmentForPdf(incidentId: string, commitmentId: string, institutionId: string) {
    const commitment = await prisma.incidentCommitment.findFirst({
      where: { id: commitmentId, incidentId, institutionId },
      include: {
        creator: { select: personSelect },
        incident: {
          include: {
            student: { select: personSelect },
            incidentType: { select: { name: true, severity: true } },
          },
        },
        institution: { select: { name: true } },
      },
    })
    if (!commitment) throw new NotFoundError('Acta no encontrada')
    return commitment
  }

  // ─── Evidencias ─────────────────────────────────────────────────────────

  async addAttachment(
    id: string,
    institutionId: string,
    actorId: string,
    file: { fileName: string; storedName: string; mimeType: string; fileSize: number },
  ) {
    await this.ensureExists(id, institutionId)
    return prisma.$transaction(async (tx) => {
      const attachment = await tx.incidentAttachment.create({
        data: {
          incidentId: id,
          institutionId,
          fileName: file.fileName,
          storedName: file.storedName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          uploadedBy: actorId,
        },
        include: { uploader: { select: personSelect } },
      })
      await tx.incidentEvent.create({
        data: {
          incidentId: id,
          institutionId,
          actorId,
          type: 'attachment_added',
          description: `Evidencia adjuntada: ${file.fileName}`,
        },
      })
      return attachment
    })
  }

  async findAttachment(attachmentId: string, institutionId: string) {
    return prisma.incidentAttachment.findFirst({ where: { id: attachmentId, institutionId } })
  }

  async deleteAttachment(attachmentId: string) {
    await prisma.incidentAttachment.delete({ where: { id: attachmentId } })
  }

  // ─── Tipos de falta (catálogo) ──────────────────────────────────────────

  async listTypes(institutionId: string) {
    return prisma.incidentType.findMany({
      where: { institutionId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async createType(institutionId: string, dto: CreateIncidentTypeDto) {
    const existing = await prisma.incidentType.findFirst({ where: { institutionId, name: dto.name } })
    if (existing) throw new ConflictError(`Ya existe un tipo de falta con el nombre "${dto.name}"`)

    const base = dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 50)
    const codeConflict = await prisma.incidentType.findFirst({ where: { institutionId, code: base } })
    const code = codeConflict ? `${base}_${Date.now()}`.slice(0, 50) : base

    return prisma.incidentType.create({
      data: {
        institutionId,
        name: dto.name,
        code,
        severity: dto.severity ?? 'leve',
        description: dto.description,
        requiresDece: dto.requiresDece ?? false,
        requiresCommitment: dto.requiresCommitment ?? false,
      },
    })
  }

  async updateType(id: string, institutionId: string, dto: UpdateIncidentTypeDto) {
    const type = await prisma.incidentType.findFirst({ where: { id, institutionId } })
    if (!type) throw new NotFoundError('Tipo de falta no encontrado')
    return prisma.incidentType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.requiresDece !== undefined && { requiresDece: dto.requiresDece }),
        ...(dto.requiresCommitment !== undefined && { requiresCommitment: dto.requiresCommitment }),
      },
    })
  }

  async toggleType(id: string, institutionId: string) {
    const type = await prisma.incidentType.findFirst({ where: { id, institutionId } })
    if (!type) throw new NotFoundError('Tipo de falta no encontrado')
    return prisma.incidentType.update({ where: { id }, data: { isActive: !type.isActive } })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Ids de los guardians (representantes) de un estudiante. */
  async getStudentGuardianIds(studentId: string): Promise<string[]> {
    const links = await prisma.guardianStudent.findMany({
      where: { studentId },
      select: { guardianId: true },
    })
    return links.map((l) => l.guardianId)
  }

  private async ensureExists(id: string, institutionId: string) {
    const existing = await prisma.disciplinaryIncident.findFirst({ where: { id, institutionId } })
    if (!existing) throw new NotFoundError('Incidente no encontrado')
    return existing
  }
}
