export interface PlatformLoginDto {
  email: string
  password: string
}

export interface PlatformLoginResponseDto {
  accessToken: string
  refreshToken: string
  admin: { id: string; email: string; name: string }
}

export interface CreateInstitutionAdminInput {
  email: string
  firstName: string
  lastName: string
  password: string
}

export interface CreateInstitutionDto {
  name: string
  code: string
  admin: CreateInstitutionAdminInput
}

export interface InstitutionListItemDto {
  id: string
  name: string
  code: string
  isActive: boolean
  userCount: number
  createdAt: Date
}

export interface InstitutionAdminDto {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  lastLoginAt: Date | null
}

export interface UpdateInstitutionAdminDto {
  email?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  password?: string
}
