import { apiGet } from '@/shared/lib/api-client'

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
