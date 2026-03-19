import { apiGet, apiPost } from '@/shared/lib/api-client'

export interface AttendanceStudent {
  id: string
  profile: { firstName: string; lastName: string; dni?: string }
}

export interface AttendanceRecord {
  id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
}

export interface AttendanceEntry {
  student: AttendanceStudent
  record: AttendanceRecord | null
}

export interface CourseAssignment {
  id: string
  subject: { id: string; name: string }
  parallel: { id: string; name: string; level: { name: string } }
  academicYear: { id: string; name: string; isActive: boolean }
  teacher: { id: string; profile: { firstName: string; lastName: string } }
}

export function getAttendance(courseAssignmentId: string, date: string) {
  return apiGet<AttendanceEntry[]>('attendance', { courseAssignmentId, date })
}

export function bulkSaveAttendance(payload: {
  courseAssignmentId: string
  date: string
  records: Array<{ studentId: string; status: string; notes?: string }>
}) {
  return apiPost('attendance/bulk', payload)
}

export function getAssignments(params?: Record<string, string>) {
  return apiGet<CourseAssignment[]>('academic/course-assignments', params)
}
