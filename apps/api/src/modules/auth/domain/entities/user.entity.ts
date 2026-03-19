export interface UserEntity {
  id: string
  institutionId: string
  email: string
  passwordHash: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  profile: ProfileEntity | null
}

export interface ProfileEntity {
  id: string
  userId: string
  firstName: string
  lastName: string
  dni: string | null
  phone: string | null
  birthDate: Date | null
  avatarUrl: string | null
}

export interface UserWithPermissions extends UserEntity {
  roles: string[]
  permissions: string[]
}
