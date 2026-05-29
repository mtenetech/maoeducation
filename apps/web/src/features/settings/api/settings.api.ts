import { apiGet, apiPut } from '@/shared/lib/api-client'
import { apiClient } from '@/shared/lib/api-client'
import type { InstitutionBranding } from '@/store/auth.store'

export interface InstitutionSettings {
  id: string
  name: string
  code: string
  branding: InstitutionBranding
}

export const settingsApi = {
  getSettings: () => apiGet<InstitutionSettings>('institution/settings'),

  updateSettings: (data: { name?: string; branding?: Partial<InstitutionBranding> }) =>
    apiPut<InstitutionSettings>('institution/settings', data),

  uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('institution/logo', { body: form }).json<{ logoUrl: string }>()
  },
}
