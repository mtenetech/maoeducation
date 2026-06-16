import { apiGet } from '@/shared/lib/api-client'

export interface GuardianChild {
  id: string
  fullName: string
  dni: string | null
  relationship: string
  isPrimary: boolean
  parallel: string | null
  academicYear: string | null
}

export function getMyChildren() {
  return apiGet<GuardianChild[]>('guardian/my-students')
}
