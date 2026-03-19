import { apiGet, apiPost, apiPatch } from '@/shared/lib/api-client'

export interface Enrollment {
  id: string
  status: string
  enrolledAt: string
  student: {
    id: string
    profile: { firstName: string; lastName: string; dni?: string }
  }
  parallel: { id: string; name: string; level: { id: string; name: string } }
  academicYear: { id: string; name: string; isActive: boolean }
}

export interface AcademicYear {
  id: string
  name: string
  isActive: boolean
}

export interface Parallel {
  id: string
  name: string
  level: { id: string; name: string }
  academicYear: { id: string; name: string; isActive: boolean }
  _count: { enrollments: number }
}

export interface StudentOption {
  id: string
  fullName: string
  email: string
}

export function listEnrollments(params?: Record<string, string>) {
  return apiGet<Enrollment[]>('enrollments', params)
}

export function createEnrollment(data: { studentId: string; parallelId: string; academicYearId: string }) {
  return apiPost<Enrollment>('enrollments', data)
}

export function bulkEnroll(data: { studentIds: string[]; parallelId: string; academicYearId: string }) {
  return apiPost<{ created: number; skipped: number }>('enrollments/bulk', data)
}

export function updateEnrollmentStatus(id: string, status: string) {
  return apiPatch(`enrollments/${id}/status`, { status })
}

export function getYears() {
  return apiGet<AcademicYear[]>('academic/years')
}

export function getParallels(yearId?: string) {
  return apiGet<Parallel[]>('academic/parallels', yearId ? { yearId } : undefined)
}

export function getStudents(search?: string) {
  return apiGet<{ data: StudentOption[]; total: number }>('users', { role: 'student', ...(search ? { search } : {}) }).then((r) => r.data)
}
