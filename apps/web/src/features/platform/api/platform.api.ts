import { platformGet, platformPost, platformPatch } from '@/shared/lib/platform-api-client'
import type { PlatformAdmin } from '@/store/platformAuth.store'

export interface PlatformLoginPayload {
  email: string
  password: string
}

export interface PlatformLoginResponse {
  accessToken: string
  admin: PlatformAdmin
}

export interface Institution {
  id: string
  name: string
  code: string
  isActive: boolean
  userCount: number
  createdAt: string
}

export interface CreateInstitutionPayload {
  name: string
  code: string
  admin: {
    email: string
    firstName: string
    lastName: string
    password: string
  }
}

export interface InstitutionAdmin {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  lastLoginAt: string | null
}

export interface CreateAdminPayload {
  email: string
  firstName: string
  lastName: string
  password: string
}

export interface UpdateAdminPayload {
  email?: string
  firstName?: string
  lastName?: string
  isActive?: boolean
  password?: string
}

export const platformApi = {
  login: (payload: PlatformLoginPayload) => platformPost<PlatformLoginResponse>('platform/login', payload),

  getInstitutions: () => platformGet<Institution[]>('platform/institutions'),
  createInstitution: (data: CreateInstitutionPayload) =>
    platformPost<Institution>('platform/institutions', data),
  toggleInstitution: (id: string) => platformPatch<Institution>(`platform/institutions/${id}/toggle`),

  getInstitutionAdmins: (institutionId: string) =>
    platformGet<InstitutionAdmin[]>(`platform/institutions/${institutionId}/admins`),
  createInstitutionAdmin: (institutionId: string, data: CreateAdminPayload) =>
    platformPost<InstitutionAdmin>(`platform/institutions/${institutionId}/admins`, data),
  updateInstitutionAdmin: (institutionId: string, userId: string, data: UpdateAdminPayload) =>
    platformPatch<InstitutionAdmin>(`platform/institutions/${institutionId}/admins/${userId}`, data),
}
