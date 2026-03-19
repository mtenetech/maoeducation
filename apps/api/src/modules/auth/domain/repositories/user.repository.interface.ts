import { UserEntity, UserWithPermissions } from '../entities/user.entity'

export interface IAuthUserRepository {
  findByEmail(email: string, institutionId: string): Promise<UserEntity | null>
  findById(id: string): Promise<UserEntity | null>
  getWithPermissions(userId: string): Promise<UserWithPermissions | null>
  updateLastLogin(userId: string): Promise<void>
}
