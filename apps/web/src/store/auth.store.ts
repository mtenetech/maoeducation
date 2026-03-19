import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
  institutionId: string
  tutorParallelIds: string[]
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),

      setAccessToken: (accessToken) => set({ accessToken }),

      clearAuth: () => set({ user: null, accessToken: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'mao-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    },
  ),
)
