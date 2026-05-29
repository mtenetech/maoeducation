import { Navigate, useLocation } from 'react-router-dom'
import { usePlatformAuthStore } from '@/store/platformAuth.store'

interface PlatformPrivateRouteProps {
  children: React.ReactNode
}

export function PlatformPrivateRoute({ children }: PlatformPrivateRouteProps) {
  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated())
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
