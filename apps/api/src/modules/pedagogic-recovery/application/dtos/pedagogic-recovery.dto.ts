export interface PedagogicRecoveryQuery {
  parallelId: string
  periodId: string
  yearId: string
}

export interface SavePedagogicRecoveryDto {
  studentId: string
  courseAssignmentId: string
  academicPeriodId: string
  score: number | null // null = borrar el registro
  notes?: string
}

export interface PedagogicRecoveryStudentRow {
  studentId: string
  studentName: string
  periodTotal: number | null      // nota original del período
  recoveryScore: number | null    // nota de recuperación (null = sin registrar)
  effectiveTotal: number | null   // nota efectiva tras aplicar el modo
  recovered: boolean              // true si la recuperación mejoró la nota
}

export interface PedagogicRecoverySubjectResult {
  assignmentId: string
  subjectName: string
  students: PedagogicRecoveryStudentRow[]
}

export interface PedagogicRecoveryPageDto {
  parallel: { id: string; name: string; level: { name: string } }
  period: { id: string; name: string; isClosed: boolean }
  recoveryMode: 'replace_if_higher' | 'average'
  passingGrade: number
  subjects: PedagogicRecoverySubjectResult[]
}
