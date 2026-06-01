import { apiGet, apiPut } from '@/shared/lib/api-client'

export interface BehaviorItem {
  studentId: string
  studentName: string
  code: string | null
  notes: string | null
}

export interface SaveBehaviorInput {
  periodId: string
  items: Array<{ studentId: string; code?: string | null; notes?: string | null }>
}

export const behaviorApi = {
  getByParallelPeriod: (parallelId: string, periodId: string) =>
    apiGet<BehaviorItem[]>(`parallels/${parallelId}/behavior`, { periodId }),

  bulkSave: (data: SaveBehaviorInput) => apiPut('behavior', data),
}
