export interface CreateEnrollmentDto {
  studentId: string
  parallelId: string
  academicYearId: string
}

export interface BulkEnrollmentDto {
  studentIds: string[]
  parallelId: string
  academicYearId: string
}

export interface UpdateEnrollmentStatusDto {
  status: 'active' | 'withdrawn'
}
