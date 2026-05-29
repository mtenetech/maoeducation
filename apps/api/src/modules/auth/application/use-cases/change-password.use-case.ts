import bcrypt from 'bcryptjs'
import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { BadRequestError, UnauthorizedError } from '../../../../shared/domain/errors/app.errors'

export class ChangePasswordUseCase {
  async execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError('La nueva contraseña debe tener al menos 6 caracteres')
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })
    if (!user) throw new UnauthorizedError()

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new BadRequestError('La contraseña actual es incorrecta')

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  }
}

export const changePasswordUseCase = new ChangePasswordUseCase()
