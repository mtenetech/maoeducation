import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { FastifyInstance } from 'fastify'
import { PrismaTaskRepository } from '../infrastructure/repositories/prisma-task.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../shared/domain/errors/app.errors'
import type { CreateTaskDto, UpdateTaskDto, ListTasksQueryDto } from '../application/dtos/task.dto'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tasks')

export default async function taskRoutes(app: FastifyInstance) {
  const repo = new PrismaTaskRepository()

  app.addHook('preHandler', authMiddleware)

  // GET /tasks — list (behavior differs by role)
  app.get<{ Querystring: ListTasksQueryDto }>(
    '/tasks',
    { preHandler: [requirePermission('tasks', 'read', 'own')] },
    async (req, reply) => {
      const { institutionId, sub: userId, roles } = req.user
      const isAdmin = roles.includes('admin') || roles.includes('inspector')
      const isTeacher = roles.includes('teacher')

      let tasks
      if (isAdmin) {
        tasks = await repo.listAll(institutionId, req.query)
      } else if (isTeacher) {
        tasks = await repo.listForTeacher(institutionId, userId, req.query)
      } else {
        // student / guardian
        tasks = await repo.listForStudent(institutionId, userId, req.query)
      }
      return reply.send(tasks)
    },
  )

  // GET /tasks/:id
  app.get<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: [requirePermission('tasks', 'read', 'own')] },
    async (req, reply) => {
      const task = await repo.getById(req.params.id, req.user.institutionId)
      return reply.send(task)
    },
  )

  // POST /tasks — teacher creates
  app.post<{ Body: CreateTaskDto }>(
    '/tasks',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      const task = await repo.create(req.user.institutionId, req.body, req.user.sub)
      return reply.status(201).send(task)
    },
  )

  // PUT /tasks/:id — teacher updates
  app.put<{ Params: { id: string }; Body: UpdateTaskDto }>(
    '/tasks/:id',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      const task = await repo.update(req.params.id, req.user.institutionId, req.body)
      return reply.send(task)
    },
  )

  // POST /tasks/:id/publish — publish to students
  app.post<{ Params: { id: string } }>(
    '/tasks/:id/publish',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      const task = await repo.publish(req.params.id, req.user.institutionId)
      return reply.send(task)
    },
  )

  // DELETE /tasks/:id
  app.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      await repo.delete(req.params.id, req.user.institutionId)
      return reply.status(204).send()
    },
  )

  // ─── Attachments ──────────────────────────────────────────────────────────

  // POST /tasks/:id/attachments — upload file
  app.post<{ Params: { id: string } }>(
    '/tasks/:id/attachments',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id, institutionId: req.user.institutionId },
      })
      if (!task) throw new NotFoundError('Tarea no encontrada')

      const data = await req.file()
      if (!data) return reply.status(400).send({ message: 'No se recibió ningún archivo' })

      // Sanitize & store
      const ext = path.extname(data.filename).toLowerCase()
      const storedName = `${crypto.randomUUID()}${ext}`
      const filePath = path.join(UPLOAD_DIR, storedName)
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      await pipeline(data.file, fs.createWriteStream(filePath))

      const stat = fs.statSync(filePath)
      const attachment = await prisma.taskAttachment.create({
        data: {
          taskId: task.id,
          institutionId: req.user.institutionId,
          fileName: data.filename,
          storedName,
          mimeType: data.mimetype,
          fileSize: stat.size,
          uploadedBy: req.user.sub,
        },
        include: { uploader: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } } },
      })
      return reply.status(201).send(attachment)
    },
  )

  // DELETE /tasks/:taskId/attachments/:attachmentId
  app.delete<{ Params: { id: string; attachmentId: string } }>(
    '/tasks/:id/attachments/:attachmentId',
    { preHandler: [requirePermission('tasks', 'write', 'own')] },
    async (req, reply) => {
      const attachment = await prisma.taskAttachment.findFirst({
        where: { id: req.params.attachmentId, institutionId: req.user.institutionId },
      })
      if (!attachment) throw new NotFoundError('Adjunto no encontrado')

      // Delete file from disk
      const filePath = path.join(UPLOAD_DIR, attachment.storedName)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

      await prisma.taskAttachment.delete({ where: { id: attachment.id } })
      return reply.status(204).send()
    },
  )
}
