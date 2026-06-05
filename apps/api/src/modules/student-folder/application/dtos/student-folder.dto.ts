export interface FolderActor {
  userId: string
  roles: string[]
}

export interface StudentListItem {
  id: string
  fullName: string
  dni: string | null
  levelName: string | null
  parallelName: string | null
}

export interface ListStudentsQuery {
  search?: string
  parallelId?: string
  page?: string
  pageSize?: string
}

export interface PaginatedStudents {
  data: StudentListItem[]
  total: number
  page: number
  pageSize: number
}
