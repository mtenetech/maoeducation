import { Outlet, useNavigate } from 'react-router-dom'
import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { usePlatformAuthStore } from '@/store/platformAuth.store'
import { platformApiClient } from '@/shared/lib/platform-api-client'

export function PlatformLayout() {
  const admin = usePlatformAuthStore((s) => s.admin)
  const clearAuth = usePlatformAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await platformApiClient.post('platform/logout')
    } catch {
      /* ignore */
    }
    clearAuth()
    navigate('/platform/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold font-display">Auleka · Plataforma</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-slate-300">
              <Building2 className="h-4 w-4" />
              {admin?.name ?? admin?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-200 hover:text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
