import { apiClient, apiGet, apiPut } from '@/shared/lib/api-client'

export interface GradesReportData {
  assignment: {
    id: string
    examWeight: number
    subject: { name: string }
    parallel: { name: string; level: { name: string } }
    teacher: { id: string; profile: { firstName: string; lastName: string } }
    academicYear: { id: string; name: string }
  }
  insumos: Array<{
    id: string
    name: string
    weight: number | null
    activities: Array<{ id: string; name: string; maxScore: number; activityDate: string | null; activityType: { code: string; name: string } }>
  }>
  students: Array<{
    student: { id: string; profile: { firstName: string; lastName: string; dni?: string } }
    grades: Record<string, number | null>
  }>
}

export interface AttendanceReportData {
  assignment: {
    id: string
    subject: { name: string }
    parallel: { name: string; level: { name: string } }
    academicYear: { id: string; name: string }
  }
  dates: string[]
  students: Array<{
    student: { id: string; profile: { firstName: string; lastName: string } }
    records: Record<string, string>
  }>
}

export interface EnrollmentReportData {
  year: { id: string; name: string }
  totalEnrollments: number
  parallels: Array<{
    parallel: { id: string; name: string; level: { name: string } }
    enrollments: Array<{
      id: string
      status: string
      student: { id: string; profile: { firstName: string; lastName: string; dni?: string; birthDate?: string } }
    }>
  }>
}

export interface MyGradesSubject {
  assignmentId: string
  subjectName: string
  teacherName: string
  examWeight: number
  insumoColumns: Array<{ name: string; avg: number | null }>
  regularAvg: number | null
  examAvg?: number | null
  total: number | null
}

export interface BulletinBranding {
  enabled?: boolean
  institutionName?: string
  title?: string
  subtitle?: string
  logoUrl?: string
  directorName?: string
  directorRole?: string
  teacherLabel?: string
  behaviorLabel?: string
  behaviorText?: string
  observationsLabel?: string
}

export interface BulletinBrandingResponse {
  global: BulletinBranding
  own: BulletinBranding | null
  effective: BulletinBranding
}

export interface BulletinOptionsData {
  years: Array<{ id: string; name: string; isActive: boolean }>
  parallels: Array<{ id: string; name: string; academicYearId: string; level: { name: string } }>
  students: Array<{ id: string; profile: { firstName: string; lastName: string; dni?: string } }>
}

export interface StudentBulletinData {
  institution: { id: string; name: string }
  academicYear: { id: string; name: string }
  parallel: {
    id: string
    name: string
    level: { name: string }
    tutor?: { id: string; profile: { firstName: string; lastName: string } } | null
  }
  student: { id: string; profile: { firstName: string; lastName: string; dni?: string } }
  periods: Array<{ id: string; name: string; periodNumber: number }>
  subjects: Array<{
    assignmentId: string
    subjectName: string
    teacherName: string
    finalAverage: number | null
    periodGrades: Array<{
      periodId: string
      periodName: string
      regularAvg: number | null
      examAvg: number | null
      total: number | null
    }>
  }>
  attendanceByPeriod: Array<{
    periodId: string
    periodName: string
    justifiedAbsences: number
    unjustifiedAbsences: number
    attendedDays: number
    lateCount: number
  }>
  overallAverage: number | null
  branding: BulletinBranding
}

export function getMyGrades(params: { periodId: string }) {
  return apiGet<MyGradesSubject[]>('reports/my-grades', params)
}

export function getGradesReport(params: { courseAssignmentId: string; periodId: string }) {
  return apiGet<GradesReportData>('reports/grades', params)
}

export function getAttendanceReport(params: { courseAssignmentId: string; startDate: string; endDate: string }) {
  return apiGet<AttendanceReportData>('reports/attendance', params)
}

export function getEnrollmentReport(params: { yearId: string; parallelId?: string }) {
  const p: Record<string, string> = { yearId: params.yearId }
  if (params.parallelId) p.parallelId = params.parallelId
  return apiGet<EnrollmentReportData>('reports/enrollment', p)
}

export function getBulletinBranding() {
  return apiGet<BulletinBrandingResponse>('reports/bulletin-branding')
}

export function saveGlobalBulletinBranding(data: BulletinBranding) {
  return apiPut('reports/bulletin-branding/global', data)
}

export function saveOwnBulletinBranding(data: BulletinBranding) {
  return apiPut('reports/bulletin-branding/own', data)
}

export async function uploadBulletinLogo(scope: 'global' | 'own', file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post(`reports/bulletin-branding/${scope}/logo`, { body: form }).json<{ url: string }>()
}

export function getBulletinOptions(params?: { yearId?: string; parallelId?: string }) {
  return apiGet<BulletinOptionsData>('reports/bulletin-options', params)
}

export function getStudentBulletin(params: { yearId: string; parallelId: string; studentId: string }) {
  return apiGet<StudentBulletinData>('reports/bulletin', params)
}
