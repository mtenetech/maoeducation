import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError, ConflictError } from '../../../../shared/domain/errors/app.errors'
import type {
  CreateEnrollmentDto,
  BulkEnrollmentDto,
  UpdateEnrollmentStatusDto,
} from '../../application/dtos/enrollment.dto'

export class PrismaEnrollmentRepository {
  async list(institutionId: string, parallelId?: string, yearId?: string) {
    return prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        ...(parallelId && { parallelId }),
        ...(yearId && { academicYearId: yearId }),
      },
      include: {
        student: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                dni: true,
                birthDate: true,
                phone: true,
              },
            },
          },
        },
        parallel: { include: { level: true } },
        academicYear: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: [
        { student: { profile: { lastName: 'asc' } } },
        { student: { profile: { firstName: 'asc' } } },
      ],
    })
  }

  async create(institutionId: string, dto: CreateEnrollmentDto) {
    const existing = await prisma.studentEnrollment.findFirst({
      where: {
        institutionId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
      },
    })
    if (existing) {
      throw new ConflictError('El estudiante ya está matriculado en este año académico')
    }

    const [student, parallel, year] = await Promise.all([
      prisma.user.findFirst({ where: { id: dto.studentId, institutionId } }),
      prisma.parallel.findFirst({ where: { id: dto.parallelId, institutionId } }),
      prisma.academicYear.findFirst({ where: { id: dto.academicYearId, institutionId } }),
    ])

    if (!student) throw new NotFoundError('Estudiante no encontrado')
    if (!parallel) throw new NotFoundError('Paralelo no encontrado')
    if (!year) throw new NotFoundError('Año académico no encontrado')

    return prisma.studentEnrollment.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        parallelId: dto.parallelId,
        academicYearId: dto.academicYearId,
        status: 'active',
      },
      include: {
        student: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, dni: true } },
          },
        },
        parallel: { include: { level: true } },
        academicYear: { select: { id: true, name: true, isActive: true } },
      },
    })
  }

  async bulkCreate(institutionId: string, dto: BulkEnrollmentDto) {
    const [parallel, year] = await Promise.all([
      prisma.parallel.findFirst({ where: { id: dto.parallelId, institutionId } }),
      prisma.academicYear.findFirst({ where: { id: dto.academicYearId, institutionId } }),
    ])
    if (!parallel) throw new NotFoundError('Paralelo no encontrado')
    if (!year) throw new NotFoundError('Año académico no encontrado')

    // Find already enrolled students for this year
    const alreadyEnrolled = await prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        academicYearId: dto.academicYearId,
        studentId: { in: dto.studentIds },
      },
      select: { studentId: true },
    })
    const enrolledSet = new Set(alreadyEnrolled.map((e) => e.studentId))
    const newStudentIds = dto.studentIds.filter((id) => !enrolledSet.has(id))

    if (newStudentIds.length === 0) {
      return { created: 0, skipped: dto.studentIds.length, enrollments: [] }
    }

    await prisma.studentEnrollment.createMany({
      data: newStudentIds.map((studentId) => ({
        institutionId,
        studentId,
        parallelId: dto.parallelId,
        academicYearId: dto.academicYearId,
        status: 'active',
      })),
    })

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        institutionId,
        academicYearId: dto.academicYearId,
        studentId: { in: newStudentIds },
      },
      include: {
        student: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, dni: true } },
          },
        },
      },
    })

    return {
      created: newStudentIds.length,
      skipped: enrolledSet.size,
      enrollments,
    }
  }

  async updateStatus(id: string, institutionId: string, dto: UpdateEnrollmentStatusDto) {
    const enrollment = await prisma.studentEnrollment.findFirst({ where: { id, institutionId } })
    if (!enrollment) throw new NotFoundError('Matrícula no encontrada')

    return prisma.studentEnrollment.update({
      where: { id },
      data: { status: dto.status },
      include: {
        student: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, dni: true } },
          },
        },
        parallel: { include: { level: true } },
        academicYear: { select: { id: true, name: true, isActive: true } },
      },
    })
  }
}
