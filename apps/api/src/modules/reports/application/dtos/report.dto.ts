export interface GradesReportQuery {
  courseAssignmentId: string
  periodId: string
}

export interface AttendanceReportQuery {
  courseAssignmentId: string
  startDate: string
  endDate: string
}

export interface EnrollmentReportQuery {
  yearId: string
  parallelId?: string
}
