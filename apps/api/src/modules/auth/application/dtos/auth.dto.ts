export interface LoginDto {
  email: string
  password: string
  institutionCode: string
}

export interface AuthUserDto {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
  institutionId: string
  tutorParallelIds: string[]
}

export interface LoginResponseDto {
  accessToken: string
  refreshToken: string
  user: AuthUserDto
}

export interface RefreshResponseDto {
  accessToken: string
}
