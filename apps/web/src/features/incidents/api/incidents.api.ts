import { apiGet, apiPost, apiPatch } from '@/shared/lib/api-client'

export interface IncidentStudent {
  id: string
  profile: { firstName: string; lastName: string; dni?: string }
}

export interface Incident {
  id: string
  studentId: string
  student: IncidentStudent
  reporter: IncidentStudent
  incidentDate: string
  category: string
  description: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'in_review' | 'resolved' | 'closed'
  resolutionNotes?: string
  resolvedAt?: string
  createdAt: string
}

export function listIncidents(params?: Record<string, string>) {
  return apiGet<Incident[]>('incidents', params)
}

export function createIncident(data: {
  studentId: string
  incidentDate: string
  category: string
  description: string
  severity: string
}) {
  return apiPost<Incident>('incidents', data)
}

export function updateIncident(
  id: string,
  data: Partial<{
    category: string
    description: string
    severity: string
    status: string
    resolutionNotes: string
  }>,
) {
  return apiPatch<Incident>(`incidents/${id}`, data)
}

export function getUsers(params?: Record<string, string>) {
  return apiGet<Array<{ id: string; fullName: string; email: string; roles: string[] }>>(
    'users',
    params,
  )
}
