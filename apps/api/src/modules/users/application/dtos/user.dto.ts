export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  roleNames: string[]
  dni?: string
  phone?: string
  birthDate?: string
}

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  dni?: string
  phone?: string
  birthDate?: string
  isActive?: boolean
}

export interface ListUsersQueryDto {
  page?: number
  limit?: number
  search?: string
  role?: string
}
