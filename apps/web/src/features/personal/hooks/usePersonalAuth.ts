import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { personalApi, PersonalRegisterDto } from '../api/personal.api'
import { useAuthStore } from '@/store/auth.store'

export function usePersonalRegister() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (dto: PersonalRegisterDto) => personalApi.register(dto),
    onSuccess: (data) => {
      const d = data as { accessToken: string; user: Parameters<typeof setAuth>[0] }
      setAuth(d.user, d.accessToken)
      navigate('/personal/setup', { replace: true })
    },
  })
}

export function usePersonalLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (dto: { email: string; password: string }) => personalApi.login(dto),
    onSuccess: (data) => {
      const d = data as { accessToken: string; user: Parameters<typeof setAuth>[0] }
      setAuth(d.user, d.accessToken)
      navigate('/dashboard', { replace: true })
    },
  })
}
