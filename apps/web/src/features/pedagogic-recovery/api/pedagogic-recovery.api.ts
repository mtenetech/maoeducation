import { apiGet, apiPut } from '@/shared/lib/api-client'

export interface PedagogicRecoveryStudentRow {
  studentId: string
  studentName: string
  periodTotal: number | null
  recoveryScore: number | null
  effectiveTotal: number | null
  recovered: boolean
}

export interface PedagogicRecoverySubject {
  assignmentId: string
  subjectName: string
  students: PedagogicRecoveryStudentRow[]
}

export interface PedagogicRecoveryPageData {
  parallel: { id: string; name: string; level: { name: string } }
  period: { id: string; name: string; isClosed: boolean }
  recoveryMode: 'replace_if_higher' | 'average'
  passingGrade: number
  subjects: PedagogicRecoverySubject[]
}

export function getPedagogicRecovery(params: { parallelId: string; periodId: string; yearId: string }) {
  return apiGet<PedagogicRecoveryPageData>('pedagogic-recovery', params)
}

export function savePedagogicRecovery(data: {
  studentId: string
  courseAssignmentId: string
  academicPeriodId: string
  score: number | null
  notes?: string
}) {
  return apiPut('pedagogic-recovery', data)
}
