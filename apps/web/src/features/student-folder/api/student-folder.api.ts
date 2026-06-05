import { apiGet, apiClient } from '@/shared/lib/api-client'

export interface FolderStudentItem {
  id: string
  fullName: string
  dni: string | null
  levelName: string | null
  parallelName: string | null
}

export interface PaginatedStudents {
  data: FolderStudentItem[]
  total: number
  page: number
  pageSize: number
}

export interface StudentListParams {
  search?: string
  parallelId?: string
  page?: number
  pageSize?: number
}

export interface FolderPerson {
  id: string
  profile: { firstName: string; lastName: string; dni?: string | null } | null
}

export interface FolderEnrollment {
  id: string
  status: string
  enrolledAt: string
  parallel: { id: string; name: string; level: { name: string; code: string } | null }
  academicYear: { id: string; name: string; startDate: string }
}

export interface FolderIncidentCommitment {
  id: string
  status: string
  createdAt: string
  creator: FolderPerson
}

export interface FolderIncident {
  id: string
  incidentDate: string
  category: string
  severity: string
  status: string
  workflowState: string
  description: string
  incidentType: { id: string; name: string; severity: string } | null
  reporter: FolderPerson
  commitments: FolderIncidentCommitment[]
}

export interface FolderParentMeeting {
  id: string
  meetingDate: string
  meetingTime: string | null
  visitorName: string
  visitorRelation: string | null
  subject: string
  signedAt: string | null
  recorder: FolderPerson
}

export interface FolderActa {
  kind: 'incident_commitment' | 'parent_meeting'
  id: string
  incidentId: string | null
  title: string
  createdAt: string
  status: string
  downloadUrl: string
}

export interface StudentFolder {
  student: {
    id: string
    email: string
    fullName: string
    roles: string[]
    profile: Record<string, unknown> | null
  }
  enrollments: FolderEnrollment[]
  incidents: FolderIncident[]
  parentMeetings: FolderParentMeeting[]
  actas: FolderActa[]
}

export const getAccessibleStudents = (params: StudentListParams = {}) =>
  apiGet<PaginatedStudents>('student-folder/students', {
    ...(params.search ? { search: params.search } : {}),
    ...(params.parallelId ? { parallelId: params.parallelId } : {}),
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  })

export const getStudentFolder = (id: string) =>
  apiGet<StudentFolder>(`student-folder/students/${id}`)

/** Descarga el certificado de matrícula (PDF) de un año. */
export async function downloadEnrollmentCertificate(studentId: string, enrollmentId: string) {
  const blob = await apiClient
    .get(`student-folder/students/${studentId}/enrollment-certificate/${enrollmentId}.pdf`)
    .blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `certificado-matricula-${enrollmentId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/** Descarga genérica de un acta (commitment de incidente o atención) por su downloadUrl. */
export async function downloadActaByUrl(downloadUrl: string, filename: string) {
  const blob = await apiClient.get(downloadUrl).blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
