import { apiPost } from '@/shared/lib/api-client'
import type { AuthUser } from '@/store/auth.store'

export interface LoginPayload {
  email: string
  password: string
  institutionCode: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export const authApi = {
  login: (payload: LoginPayload) => apiPost<LoginResponse>('auth/login', payload),
  logout: () => apiPost<void>('auth/logout'),
  me: () => apiPost<AuthUser>('auth/me'),
}
