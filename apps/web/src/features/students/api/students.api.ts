import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from '@/shared/lib/api-client'
import type { DynamicSchema } from '@/shared/components/form/DynamicForm'

export interface StudentProfile {
  firstName: string
  lastName: string
  dni: string | null
  phone: string | null
  birthDate: string | null
  phoneAlt: string | null
  address: string | null
  occupation: string | null
  nationality: string | null
  placeOfBirth: string | null
  bloodType: string | null
  gender: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
}

export interface StudentDetail {
  id: string
  email: string
  fullName: string
  isActive: boolean
  roles: string[]
  profile: StudentProfile | null
}

export interface Guardian {
  guardianId: string
  email: string
  fullName: string
  relationship: string
  isPrimary: boolean
  isLegalRep: boolean
  livesWithStudent: boolean
  isEmergencyContact: boolean
  profile: {
    dni: string | null
    phone: string | null
    phoneAlt: string | null
    address: string | null
    occupation: string | null
  } | null
}

export interface AnamnesisTemplate {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  schema: DynamicSchema
}

export interface AnamnesisResponse {
  template: AnamnesisTemplate
  record: { id: string; answers: Record<string, unknown>; templateId: string } | null
}

// ---- Estudiante (datos) ----
export const getStudent = (id: string) => apiGet<StudentDetail>(`users/${id}`)
export const updateStudent = (id: string, data: Partial<StudentProfile> & { isActive?: boolean }) =>
  apiPut<StudentDetail>(`users/${id}`, data)

// Restablece la contraseña de cualquier usuario del tenant (admin)
export const resetUserPassword = (userId: string, password: string) =>
  apiPut<StudentDetail>(`users/${userId}`, { password })

// ---- Representantes ----
export const getGuardians = (id: string) => apiGet<Guardian[]>(`students/${id}/guardians`)

export interface CreateGuardianPayload {
  existingGuardianId?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  dni?: string
  phone?: string
  phoneAlt?: string
  address?: string
  occupation?: string
  relationship?: string
  isPrimary?: boolean
  isLegalRep?: boolean
  livesWithStudent?: boolean
  isEmergencyContact?: boolean
}

export const addGuardian = (id: string, data: CreateGuardianPayload) =>
  apiPost<Guardian[]>(`students/${id}/guardians`, data)

export const updateGuardianLink = (
  id: string,
  guardianId: string,
  data: Partial<Pick<Guardian, 'relationship' | 'isPrimary' | 'isLegalRep' | 'livesWithStudent' | 'isEmergencyContact'>>,
) => apiPatch<Guardian[]>(`students/${id}/guardians/${guardianId}`, data)

export const removeGuardian = (id: string, guardianId: string) =>
  apiDelete(`students/${id}/guardians/${guardianId}`)

// ---- Anamnesis ----
export const getStudentAnamnesis = (id: string) =>
  apiGet<AnamnesisResponse>(`students/${id}/anamnesis`)

export const saveStudentAnamnesis = (
  id: string,
  data: { templateId?: string; answers: Record<string, unknown> },
) => apiPut<{ id: string }>(`students/${id}/anamnesis`, data)

// ---- Plantillas de anamnesis (admin) ----
export const listAnamnesisTemplates = () => apiGet<AnamnesisTemplate[]>('anamnesis/templates')
export const updateAnamnesisTemplate = (
  id: string,
  data: { name?: string; schema?: DynamicSchema; isDefault?: boolean },
) => apiPut<AnamnesisTemplate>(`anamnesis/templates/${id}`, data)
export const createAnamnesisTemplate = (data: { name: string; schema: DynamicSchema }) =>
  apiPost<AnamnesisTemplate>('anamnesis/templates', data)
