import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { PrismaInstitutionRepository } from '../infrastructure/repositories/prisma-institution.repository'
import type { UpdateInstitutionSettingsDto } from '../application/dtos/institution.dto'

const LOGO_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'branding')
const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export default async function institutionRoutes(app: FastifyInstance) {
  const repo = new PrismaInstitutionRepository()

  app.addHook('preHandler', authMiddleware)

  // GET /institution/settings — cualquiera autenticado de la institución
  app.get('/institution/settings', async (req, reply) => {
    return reply.send(await repo.getSettings(req.user.institutionId))
  })

  // PUT /institution/settings — solo admin (institution_config:manage)
  app.put<{ Body: UpdateInstitutionSettingsDto }>(
    '/institution/settings',
    {
      preHandler: [requirePermission('institution_config', 'manage')],
      schema: {
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            branding: {
              type: 'object',
              properties: {
                logoUrl: { type: ['string', 'null'] },
                primaryColor: { type: ['string', 'null'] },
                sidebarColor: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      return reply.send(await repo.updateSettings(req.user.institutionId, req.body))
    },
  )

  // POST /institution/logo — subir logo (multipart)
  app.post(
    '/institution/logo',
    { preHandler: [requirePermission('institution_config', 'manage')] },
    async (req, reply) => {
      const data = await req.file()
      if (!data) return reply.status(400).send({ message: 'No se recibió ningún archivo' })
      if (!ALLOWED_LOGO_MIME.includes(data.mimetype)) {
        return reply.status(400).send({ message: 'Formato no permitido (usa PNG, JPG, SVG o WebP)' })
      }

      const ext = path.extname(data.filename).toLowerCase() || '.png'
      const storedName = `${req.user.institutionId}-${crypto.randomUUID()}${ext}`
      const filePath = path.join(LOGO_UPLOAD_DIR, storedName)
      fs.mkdirSync(LOGO_UPLOAD_DIR, { recursive: true })
      await pipeline(data.file, fs.createWriteStream(filePath))

      const logoUrl = `/uploads/branding/${storedName}`
      await repo.setLogoUrl(req.user.institutionId, logoUrl)
      return reply.status(201).send({ logoUrl })
    },
  )
}
