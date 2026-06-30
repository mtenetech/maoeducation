import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { personalApi, PersonalRegisterDto } from '../api/personal.api'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/lib/utils'

export function usePersonalRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (dto: PersonalRegisterDto) => personalApi.register(dto),
    onSuccess: (_data, variables) => {
      navigate(`/personal/check-email?email=${encodeURIComponent(variables.email)}`, { replace: true })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
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

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => personalApi.resendVerification(email),
    onSuccess: () => toast.success('Enlace enviado. Revisa tu bandeja.'),
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
