import { Outlet } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { usePermissions } from '@/shared/hooks/usePermissions'

interface PermissionGuardProps {
  permission: string
  children?: React.ReactNode
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <ShieldOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Acceso denegado</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          No tienes permisos para ver esta sección.
        </p>
      </div>
    )
  }

  return <>{children ?? <Outlet />}</>
}
