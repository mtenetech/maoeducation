import { apiGet, apiPost, apiDelete } from '@/shared/lib/api-client'

export interface ScheduleEntry {
  id: string
  weekday: number
  startTime: string
  endTime: string
  room?: string
  courseAssignment: {
    id: string
    subject: { id: string; name: string }
    parallel: { id: string; name: string; level: { name: string } }
    teacher: { id: string; profile: { firstName: string; lastName: string } }
    academicYear: { id: string; name: string }
  }
}

export function getSchedule(params?: Record<string, string>) {
  return apiGet<ScheduleEntry[]>('schedules', params)
}

export function createScheduleEntry(data: {
  courseAssignmentId: string
  weekday: number
  startTime: string
  endTime: string
  room?: string
}) {
  return apiPost<ScheduleEntry>('schedules', data)
}

export function deleteScheduleEntry(id: string) {
  return apiDelete(`schedules/${id}`)
}

export function getAssignments(params?: Record<string, string>) {
  return apiGet<Array<{
    id: string
    subject: { id: string; name: string }
    parallel: { id: string; name: string; level: { name: string } }
    academicYear: { id: string; name: string; isActive: boolean }
    teacher: { id: string; profile: { firstName: string; lastName: string } }
  }>>('academic/course-assignments', params)
}
