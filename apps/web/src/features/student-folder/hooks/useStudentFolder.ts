import { useQuery } from '@tanstack/react-query'
import { getAccessibleStudents, getStudentFolder } from '../api/student-folder.api'

export function useAccessibleStudents() {
  return useQuery({
    queryKey: ['student-folder', 'students'],
    queryFn: getAccessibleStudents,
  })
}

export function useStudentFolder(id: string) {
  return useQuery({
    queryKey: ['student-folder', id],
    queryFn: () => getStudentFolder(id),
    enabled: !!id,
  })
}
