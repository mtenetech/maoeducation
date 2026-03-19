export interface UserListItem {
  id: string
  email: string
  isActive: boolean
  roles: string[]
  fullName: string
  avatarUrl: string | null
  createdAt: Date
}

export interface UserDetail extends UserListItem {
  institutionId: string
  profile: {
    firstName: string
    lastName: string
    dni: string | null
    phone: string | null
    birthDate: Date | null
  } | null
}
