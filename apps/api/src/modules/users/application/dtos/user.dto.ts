export interface ProfileFieldsDto {
  phoneAlt?: string
  address?: string
  occupation?: string
  nationality?: string
  placeOfBirth?: string
  bloodType?: string
  gender?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface CreateUserDto extends ProfileFieldsDto {
  email: string
  password?: string // opcional: por defecto = cédula
  firstName: string
  lastName: string
  roleNames: string[]
  dni: string // obligatoria, 10 dígitos, única en la institución
  phone?: string
  birthDate?: string
}

export interface UpdateUserDto extends ProfileFieldsDto {
  firstName?: string
  lastName?: string
  dni?: string
  phone?: string
  birthDate?: string
  isActive?: boolean
  password?: string
}

export interface ListUsersQueryDto {
  page?: number
  limit?: number
  search?: string
  role?: string
}
