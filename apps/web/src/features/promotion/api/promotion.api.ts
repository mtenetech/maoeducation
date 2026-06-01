import { apiGet, apiPut } from '@/shared/lib/api-client'

export type SubjectStatus = 'approved' | 'supletorio' | 'remedial' | 'pending'
export type EffectiveStatus = 'passed' | 'failed' | 'recovery_pending' | 'pending'
export type PromotionStatus = 'promoted' | 'not_promoted' | 'pending'
export type RecoveryType = 'supletorio' | 'remedial' | 'gracia'

export interface PromotionSubject {
  assignmentId: string
  subjectName: string
  annualAvg: number | null
  status: SubjectStatus
  recovery: { type: RecoveryType; score: number } | null
  effectiveStatus: EffectiveStatus
}

export interface PromotionStudent {
  studentId: string
  studentName: string
  subjects: PromotionSubject[]
  failedCount: number
  suggestedStatus: PromotionStatus
  decision: { status: PromotionStatus; notes: string | null } | null
}

export interface ParallelPromotion {
  parallel: { id: string; name: string; level: { name: string } }
  year: { id: string; name: string }
  config: {
    minToPass: number
    supletorioMin: number
    supletorioMax: number
    passWithExam: number
    maxFailedSubjects: number
  }
  subjects: Array<{ assignmentId: string; subjectName: string }>
  students: PromotionStudent[]
}

export interface SaveRecoveryInput {
  studentId: string
  courseAssignmentId: string
  academicYearId: string
  type: RecoveryType
  score: number | null
}

export interface SaveDecisionInput {
  studentId: string
  academicYearId: string
  status: PromotionStatus
  notes?: string | null
}

export const promotionApi = {
  getByParallel: (parallelId: string, yearId: string) =>
    apiGet<ParallelPromotion>(`parallels/${parallelId}/promotion`, { yearId }),

  saveRecovery: (data: SaveRecoveryInput) => apiPut('promotion/recovery', data),

  saveDecision: (data: SaveDecisionInput) => apiPut('promotion/decision', data),
}
