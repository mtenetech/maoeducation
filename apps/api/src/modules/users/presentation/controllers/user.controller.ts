import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository'
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '../../application/dtos/user.dto'

const repo = new PrismaUserRepository()

export const userController = {
  async list(
    req: FastifyRequest<{ Querystring: ListUsersQueryDto }>,
    reply: FastifyReply,
  ) {
    const result = await repo.list(req.user.institutionId, req.query)
    return reply.send(result)
  },

  async getById(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const user = await repo.findById(req.params.id, req.user.institutionId)
    return reply.send(user)
  },

  async create(
    req: FastifyRequest<{ Body: CreateUserDto }>,
    reply: FastifyReply,
  ) {
    const user = await repo.create(req.user.institutionId, req.body)
    return reply.status(201).send(user)
  },

  async update(
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateUserDto }>,
    reply: FastifyReply,
  ) {
    const user = await repo.update(req.params.id, req.user.institutionId, req.body)
    return reply.send(user)
  },

  async deactivate(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    await repo.deactivate(req.params.id, req.user.institutionId)
    return reply.status(204).send()
  },
}
