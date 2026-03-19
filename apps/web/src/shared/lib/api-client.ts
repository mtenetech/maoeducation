import ky, { HTTPError } from 'ky'
import { useAuthStore } from '@/store/auth.store'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

let isRefreshing = false

export const apiClient = ky.create({
  prefixUrl: `${API_BASE}/api/v1`,
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401 && !isRefreshing) {
          isRefreshing = true
          try {
            const refreshed = await ky.post(`${API_BASE}/api/v1/auth/refresh`).json<{ accessToken: string }>()
            useAuthStore.getState().setAccessToken(refreshed.accessToken)
            // Retry original request with new token
            request.headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
            isRefreshing = false
            return ky(request)
          } catch {
            isRefreshing = false
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      },
    ],
    beforeError: [
      async (error: HTTPError) => {
        const { response } = error
        if (response?.body) {
          try {
            const body = await response.clone().json() as { error?: { message?: string } }
            if (body.error?.message) {
                ;(error as unknown as { message: string }).message = body.error.message
            }
          } catch { /* ignore */ }
        }
        return error
      },
    ],
  },
})

export async function apiGet<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const searchParams = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined
  return apiClient.get(url, { searchParams }).json<T>()
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  return apiClient.post(url, { json: data }).json<T>()
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  return apiClient.put(url, { json: data }).json<T>()
}

export async function apiPatch<T>(url: string, data?: unknown): Promise<T> {
  return apiClient.patch(url, { json: data }).json<T>()
}

export async function apiDelete(url: string): Promise<void> {
  await apiClient.delete(url)
}
