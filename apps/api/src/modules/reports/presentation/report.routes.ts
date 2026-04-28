import { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { PrismaReportRepository } from '../infrastructure/prisma-report.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import type {
  GradesReportQuery,
  AttendanceReportQuery,
  EnrollmentReportQuery,
  BulletinOptionsQuery,
  BulletinReportQuery,
} from '../application/dtos/report.dto'

const repo = new PrismaReportRepository()
const REPORT_TYPE = 'grade_bulletin_branding'
const REPORT_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'reports')

type BulletinBranding = {
  enabled?: boolean
  institutionName?: string
  title?: string
  subtitle?: string
  logoUrl?: string
  directorName?: string
  directorRole?: string
  teacherLabel?: string
  behaviorLabel?: string
  behaviorText?: string
  observationsLabel?: string
}

function mergeBranding(globalBranding: BulletinBranding, ownBranding?: BulletinBranding | null) {
  const enabled = ownBranding?.enabled ?? false
  if (!enabled) return globalBranding

  return {
    ...globalBranding,
    ...Object.fromEntries(
      Object.entries(ownBranding).filter(([, value]) => value !== undefined && value !== ''),
    ),
  }
}

async function getBranding(institutionId: string, userId: string) {
  const [institution, globalTemplate, ownTemplate] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true },
    }),
    prisma.reportTemplate.findFirst({
      where: { institutionId, type: REPORT_TYPE, createdBy: null },
    }),
    prisma.reportTemplate.findFirst({
      where: { institutionId, type: REPORT_TYPE, createdBy: userId },
    }),
  ])

  const globalVars = (globalTemplate?.variables ?? {}) as BulletinBranding
  const ownVars = (ownTemplate?.variables ?? null) as BulletinBranding | null

  const globalBranding: BulletinBranding = {
    institutionName: institution?.name ?? 'Institución educativa',
    title: 'INFORME DE CALIFICACIONES',
    subtitle: '',
    logoUrl: '',
    directorName: '',
    directorRole: 'DIRECTOR/A',
    teacherLabel: 'DOCENTE TUTOR/A',
    behaviorLabel: 'COMPORTAMIENTO',
    behaviorText: ' ',
    observationsLabel: 'OBSERVACIONES',
    ...globalVars,
  }

  return {
    global: globalBranding,
    own: ownVars,
    effective: mergeBranding(globalBranding, ownVars),
  }
}

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Querystring: GradesReportQuery }>(
    '/reports/grades',
    async (req, reply) => {
      const result = await repo.getGradesReport(req.user.institutionId, req.query, {
        userId: req.user.sub,
        roles: req.user.roles,
      })
      return reply.send(result)
    },
  )

  app.get<{ Querystring: AttendanceReportQuery }>(
    '/reports/attendance',
    async (req, reply) => {
      const result = await repo.getAttendanceReport(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )

  // GET /reports/my-grades?periodId=X  — student/guardian: all subjects compact grades
  app.get<{ Querystring: { periodId: string } }>('/reports/my-grades', async (req, reply) => {
    const { sub: userId, institutionId, roles } = req.user
    let studentId = userId
    if (roles.includes('guardian')) {
      const link = await prisma.guardianStudent.findFirst({
        where: { guardianId: userId },
        select: { studentId: true },
      })
      if (link) studentId = link.studentId
    }
    const result = await repo.getMyGrades(institutionId, studentId, req.query.periodId)
    return reply.send(result)
  })

  app.get<{ Querystring: EnrollmentReportQuery }>(
    '/reports/enrollment',
    async (req, reply) => {
      const result = await repo.getEnrollmentReport(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )

  app.get<{ Querystring: BulletinOptionsQuery }>(
    '/reports/bulletin-options',
    async (req, reply) => {
      const result = await repo.getBulletinOptions(req.user.institutionId, req.query, {
        userId: req.user.sub,
        roles: req.user.roles,
      })
      return reply.send(result)
    },
  )

  app.get<{ Querystring: BulletinReportQuery }>(
    '/reports/bulletin',
    async (req, reply) => {
      const [branding, bulletin] = await Promise.all([
        getBranding(req.user.institutionId, req.user.sub),
        repo.getStudentBulletin(req.user.institutionId, req.query, {
          userId: req.user.sub,
          roles: req.user.roles,
        }),
      ])
      return reply.send({
        ...bulletin,
        branding: branding.effective,
      })
    },
  )

  app.get('/reports/bulletin-branding', async (req, reply) => {
    const branding = await getBranding(req.user.institutionId, req.user.sub)
    return reply.send(branding)
  })

  app.put<{ Body: BulletinBranding }>(
    '/reports/bulletin-branding/global',
    { preHandler: [requirePermission('academic_config', 'manage')] },
    async (req, reply) => {
      const existing = await prisma.reportTemplate.findFirst({
        where: { institutionId: req.user.institutionId, type: REPORT_TYPE, createdBy: null },
      })

      const saved = existing
        ? await prisma.reportTemplate.update({
            where: { id: existing.id },
            data: { variables: req.body, templateBody: 'grade-bulletin-v1', isDefault: true },
          })
        : await prisma.reportTemplate.create({
            data: {
              institutionId: req.user.institutionId,
              name: 'Boletín global',
              type: REPORT_TYPE,
              templateBody: 'grade-bulletin-v1',
              variables: req.body,
              isDefault: true,
            },
          })

      return reply.send(saved)
    },
  )

  app.put<{ Body: BulletinBranding }>(
    '/reports/bulletin-branding/own',
    async (req, reply) => {
      const existing = await prisma.reportTemplate.findFirst({
        where: { institutionId: req.user.institutionId, type: REPORT_TYPE, createdBy: req.user.sub },
      })

      const saved = existing
        ? await prisma.reportTemplate.update({
            where: { id: existing.id },
            data: { variables: req.body, templateBody: 'grade-bulletin-v1' },
          })
        : await prisma.reportTemplate.create({
            data: {
              institutionId: req.user.institutionId,
              name: 'Boletín docente',
              type: REPORT_TYPE,
              templateBody: 'grade-bulletin-v1',
              variables: req.body,
              createdBy: req.user.sub,
            },
          })

      return reply.send(saved)
    },
  )

  app.post<{ Params: { scope: string } }>(
    '/reports/bulletin-branding/:scope/logo',
    async (req, reply) => {
      const scope = req.params.scope === 'global' ? 'global' : 'own'
      const canEditGlobal = req.user.roles.includes('admin') || req.user.permissions.some((p) => p.startsWith('academic_config:manage'))
      if (scope === 'global' && !canEditGlobal) return reply.status(403).send({ message: 'Sin permiso para editar la configuración global' })

      const data = await req.file()
      if (!data) return reply.status(400).send({ message: 'No se recibió ningún archivo' })

      const ext = path.extname(data.filename).toLowerCase()
      const storedName = `${crypto.randomUUID()}${ext}`
      fs.mkdirSync(REPORT_UPLOAD_DIR, { recursive: true })
      await pipeline(data.file, fs.createWriteStream(path.join(REPORT_UPLOAD_DIR, storedName)))

      return reply.status(201).send({
        url: `/uploads/reports/${storedName}`,
      })
    },
  )
}
