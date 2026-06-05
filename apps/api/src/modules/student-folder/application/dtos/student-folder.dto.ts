export interface FolderActor {
  userId: string
  roles: string[]
}

export interface StudentListItem {
  id: string
  fullName: string
  dni: string | null
}
