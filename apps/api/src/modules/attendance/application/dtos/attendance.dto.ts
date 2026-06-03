export interface BulkAttendanceDto {
  // Modo por materia → courseAssignmentId; modo diario → parallelId. Exactamente uno.
  courseAssignmentId?: string
  parallelId?: string
  date: string // ISO date string "YYYY-MM-DD"
  records: Array<{
    studentId: string
    status: 'present' | 'absent' | 'late' | 'excused'
    notes?: string
  }>
}

export interface GetAttendanceQuery {
  courseAssignmentId?: string
  parallelId?: string
  date: string
}

export interface AttendanceSummaryQuery {
  courseAssignmentId?: string
  periodId?: string // this maps to academicPeriodId filter on Activity, but for attendance we filter by date range
}

export interface CreateJustificationDto {
  studentId: string
  attendanceRecordIds: string[]
  reason: string
  documentUrl?: string
}
