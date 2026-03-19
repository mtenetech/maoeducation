import bcrypt from 'bcryptjs'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '../../application/dtos/user.dto'
import { UserDetail, UserListItem } from '../../domain/entities/user.entity'
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/app.errors'

export class PrismaUserRepository {
  async list(
    institutionId: string,
    query: ListUsersQueryDto,
  ): Promise<{ data: UserListItem[]; total: number }> {
    const page  = query.page  ?? 1
    const limit = query.limit ?? 20
    const skip  = (page - 1) * limit

    const where = {
      institutionId,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { profile: { firstName: { contains: query.search, mode: 'insensitive' as const } } },
              { profile: { lastName:  { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(query.role
        ? { userRoles: { some: { role: { name: query.role } } } }
        : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          userRoles: { include: { role: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        isActive: u.isActive,
        roles: u.userRoles.map((ur) => ur.role.name),
        fullName: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
        avatarUrl: u.profile?.avatarUrl ?? null,
        createdAt: u.createdAt,
      })),
      total,
    }
  }

  async findById(id: string, institutionId: string): Promise<UserDetail | null> {
    const u = await prisma.user.findFirst({
      where: { id, institutionId },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    })
    if (!u) return null

    return {
      id: u.id,
      email: u.email,
      isActive: u.isActive,
      institutionId: u.institutionId,
      roles: u.userRoles.map((ur) => ur.role.name),
      fullName: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
      avatarUrl: u.profile?.avatarUrl ?? null,
      createdAt: u.createdAt,
      profile: u.profile
        ? {
            firstName: u.profile.firstName,
            lastName:  u.profile.lastName,
            dni:       u.profile.dni,
            phone:     u.profile.phone,
            birthDate: u.profile.birthDate,
          }
        : null,
    }
  }

  async create(institutionId: string, dto: CreateUserDto): Promise<UserDetail> {
    const exists = await prisma.user.findUnique({
      where: { institutionId_email: { institutionId, email: dto.email } },
    })
    if (exists) throw new ConflictError('El email ya está registrado en esta institución')

    const roles = await prisma.role.findMany({
      where: { institutionId, name: { in: dto.roleNames } },
    })

    const passwordHash = await bcrypt.hash(dto.password, 12)

    const user = await prisma.user.create({
      data: {
        institutionId,
        email: dto.email,
        passwordHash,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName:  dto.lastName,
            dni:       dto.dni,
            phone:     dto.phone,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          },
        },
        userRoles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      include: {
        profile: true,
        userRoles: { include: { role: true } },
      },
    })

    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      institutionId: user.institutionId,
      roles: user.userRoles.map((ur) => ur.role.name),
      fullName: `${user.profile!.firstName} ${user.profile!.lastName}`,
      avatarUrl: null,
      createdAt: user.createdAt,
      profile: {
        firstName: user.profile!.firstName,
        lastName:  user.profile!.lastName,
        dni:       user.profile!.dni,
        phone:     user.profile!.phone,
        birthDate: user.profile!.birthDate,
      },
    }
  }

  async update(id: string, institutionId: string, dto: UpdateUserDto): Promise<UserDetail> {
    const user = await prisma.user.findFirst({ where: { id, institutionId } })
    if (!user) throw new NotFoundError('Usuario no encontrado')

    await prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        profile: {
          update: {
            ...(dto.firstName  !== undefined && { firstName: dto.firstName }),
            ...(dto.lastName   !== undefined && { lastName:  dto.lastName }),
            ...(dto.dni        !== undefined && { dni:       dto.dni }),
            ...(dto.phone      !== undefined && { phone:     dto.phone }),
            ...(dto.birthDate  !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
          },
        },
      },
    })

    return (await this.findById(id, institutionId))!
  }

  async deactivate(id: string, institutionId: string): Promise<void> {
    const user = await prisma.user.findFirst({ where: { id, institutionId } })
    if (!user) throw new NotFoundError('Usuario no encontrado')
    await prisma.user.update({ where: { id }, data: { isActive: false } })
  }
}
