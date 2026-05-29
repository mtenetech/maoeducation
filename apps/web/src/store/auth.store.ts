import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface InstitutionBranding {
  logoUrl: string | null
  primaryColor: string | null
  sidebarColor: string | null
}

export interface AuthInstitution {
  id: string
  name: string
  branding: InstitutionBranding
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
  institutionId: string
  institution: AuthInstitution | null
  tutorParallelIds: string[]
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (user: AuthUser, token: string) => void
  setAccessToken: (token: string) => void
  setInstitution: (institution: AuthInstitution) => void
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

      setInstitution: (institution) => {
        const user = get().user
        if (user) set({ user: { ...user, institution } })
      },

      clearAuth: () => set({ user: null, accessToken: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'mao-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    },
  ),
)
