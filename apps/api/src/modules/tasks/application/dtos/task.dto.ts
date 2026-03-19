export interface CreateTaskDto {
  courseAssignmentId: string
  title: string
  description?: string
  dueDate: string
  publishAt?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  dueDate?: string
  publishAt?: string
}

export interface ListTasksQueryDto {
  courseAssignmentId?: string
  academicYearId?: string
  from?: string
  to?: string
}
