import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getAccessibleStudents, getStudentFolder, type StudentListParams } from '../api/student-folder.api'

export function useAccessibleStudents(params: StudentListParams) {
  return useQuery({
    queryKey: ['student-folder', 'students', params],
    queryFn: () => getAccessibleStudents(params),
    placeholderData: keepPreviousData,
  })
}

export function useStudentFolder(id: string) {
  return useQuery({
    queryKey: ['student-folder', id],
    queryFn: () => getStudentFolder(id),
    enabled: !!id,
  })
}
