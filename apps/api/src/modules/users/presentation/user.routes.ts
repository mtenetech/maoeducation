import { FastifyInstance } from 'fastify'
import { PrismaUserRepository } from '../infrastructure/repositories/prisma-user.repository'
import { authMiddleware } from '../../../shared/infrastructure/middleware/auth.middleware'
import { requirePermission } from '../../../shared/infrastructure/middleware/rbac.middleware'
import { prisma } from '../../../shared/infrastructure/database/prisma'
import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '../application/dtos/user.dto'

const repo = new PrismaUserRepository()

export default async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get<{ Querystring: ListUsersQueryDto }>(
    '/users',
    {
      preHandler: [requirePermission('users', 'read')],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page:   { type: 'integer', minimum: 1 },
            limit:  { type: 'integer', minimum: 1, maximum: 200 },
            search: { type: 'string' },
            role:   { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const result = await repo.list(req.user.institutionId, req.query)
      return reply.send(result)
    },
  )

  app.get<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: [requirePermission('users', 'read')] },
    async (req, reply) => {
      const user = await repo.findById(req.params.id, req.user.institutionId)
      return reply.send(user)
    },
  )

  app.post<{ Body: CreateUserDto }>(
    '/users',
    {
      preHandler: [requirePermission('users', 'manage')],
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName', 'roleNames'],
          properties: {
            email:     { type: 'string', format: 'email' },
            password:  { type: 'string', minLength: 6 },
            firstName: { type: 'string', minLength: 1 },
            lastName:  { type: 'string', minLength: 1 },
            roleNames: { type: 'array', items: { type: 'string' }, minItems: 1 },
            dni:       { type: 'string' },
            phone:     { type: 'string' },
            birthDate: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const user = await repo.create(req.user.institutionId, req.body)
      return reply.status(201).send(user)
    },
  )

  app.put<{ Params: { id: string }; Body: UpdateUserDto }>(
    '/users/:id',
    { preHandler: [requirePermission('users', 'write')] },
    async (req, reply) => {
      const user = await repo.update(req.params.id, req.user.institutionId, req.body)
      return reply.send(user)
    },
  )

  app.patch<{ Params: { id: string } }>(
    '/users/:id/deactivate',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      await repo.deactivate(req.params.id, req.user.institutionId)
      return reply.status(204).send()
    },
  )

  // ─── Roles & Permissions ────────────────────────────────────────────────────

  app.get(
    '/roles',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      const roles = await prisma.role.findMany({
        where: { institutionId: req.user.institutionId },
        include: {
          rolePermissions: { include: { permission: true } },
        },
        orderBy: { name: 'asc' },
      })
      return reply.send(roles.map((r) => ({
        id: r.id,
        name: r.name,
        label: r.label,
        isSystem: r.isSystem,
        permissions: r.rolePermissions.map((rp) => ({
          id: rp.permission.id,
          key: `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`,
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.permission.scope,
          description: rp.permission.description,
        })),
      })))
    },
  )

  app.get(
    '/permissions',
    { preHandler: [requirePermission('users', 'manage')] },
    async (_req, reply) => {
      const perms = await prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] })
      return reply.send(perms.map((p) => ({
        id: p.id,
        key: `${p.resource}:${p.action}:${p.scope}`,
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        description: p.description,
      })))
    },
  )

  app.put<{ Params: { id: string }; Body: { permissionIds: string[] } }>(
    '/roles/:id/permissions',
    { preHandler: [requirePermission('users', 'manage')] },
    async (req, reply) => {
      const role = await prisma.role.findFirst({
        where: { id: req.params.id, institutionId: req.user.institutionId },
      })
      if (!role) return reply.status(404).send({ message: 'Rol no encontrado' })
      if (role.name === 'admin') return reply.status(403).send({ message: 'No se pueden modificar los permisos del administrador' })

      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
        prisma.rolePermission.createMany({
          data: req.body.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        }),
      ])

      const updated = await prisma.role.findUnique({
        where: { id: role.id },
        include: { rolePermissions: { include: { permission: true } } },
      })
      return reply.send({
        id: updated!.id,
        name: updated!.name,
        label: updated!.label,
        permissions: updated!.rolePermissions.map((rp) => ({
          id: rp.permission.id,
          key: `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`,
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: rp.permission.scope,
        })),
      })
    },
  )
}
