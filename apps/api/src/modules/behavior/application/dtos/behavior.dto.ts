export interface BehaviorItemDto {
  studentId: string
  studentName: string
  code: string | null
  notes: string | null
}

export interface SaveBehaviorDto {
  periodId: string
  items: Array<{ studentId: string; code?: string | null; notes?: string | null }>
}
