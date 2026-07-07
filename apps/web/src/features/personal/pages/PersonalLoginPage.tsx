import { Navigate } from 'react-router-dom'

export function PersonalLoginPage() {
  return <Navigate to="/login?type=personal" replace />
}
