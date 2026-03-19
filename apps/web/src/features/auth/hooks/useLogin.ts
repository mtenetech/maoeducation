import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi, type LoginPayload } from '../api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { getErrorMessage } from '@/shared/lib/utils'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
