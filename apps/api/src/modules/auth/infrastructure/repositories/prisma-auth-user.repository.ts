import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { IAuthUserRepository } from '../../domain/repositories/user.repository.interface'
import { UserEntity, UserWithPermissions } from '../../domain/entities/user.entity'

export class PrismaAuthUserRepository implements IAuthUserRepository {
  async findByEmail(email: string, institutionId: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { institutionId_email: { email, institutionId } },
      include: { profile: true },
    })
    return user
  }

  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })
  }

  async getWithPermissions(userId: string): Promise<UserWithPermissions | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user) return null

    const roles = user.userRoles.map((ur) => ur.role.name)
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`,
      ),
    )

    return { ...user, roles, permissions: [...new Set(permissions)] }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
  }
}
