import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { apiGet, apiPut } from '@/shared/lib/api-client'
import { getErrorMessage, cn } from '@/shared/lib/utils'

// ---- Types ----

interface Permission {
  id: string
  key: string
  resource: string
  action: string
  scope: string
  description?: string
}

interface Role {
  id: string
  name: string
  label: string
  isSystem: boolean
  permissions: Permission[]
}

// ---- API ----

function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<Role[]>('roles'),
  })
}

function useAllPermissions() {
  return useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () => apiGet<Permission[]>('permissions'),
  })
}

function useUpdateRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      apiPut(`roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Permisos actualizados correctamente')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ---- Helpers ----

const RESOURCE_LABELS: Record<string, string> = {
  users: 'Usuarios',
  academic_config: 'Configuración académica',
  activities: 'Actividades',
  grades: 'Calificaciones',
  attendance: 'Asistencia',
  incidents: 'Incidentes',
  reports: 'Reportes',
  insumos: 'Insumos',
  messages: 'Mensajes',
  schedules: 'Horarios',
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Ver',
  write: 'Editar',
  manage: 'Administrar',
}

const SCOPE_LABELS: Record<string, string> = {
  all: 'Todo',
  own: 'Propio',
}

// ---- Role Card ----

interface RoleCardProps {
  role: Role
  allPermissions: Permission[]
}

function RoleCard({ role, allPermissions }: RoleCardProps) {
  const updatePermissions = useUpdateRolePermissions()
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(role.permissions.map((p) => p.id)),
  )
  const [dirty, setDirty] = React.useState(false)

  // Sync when role data refreshes
  React.useEffect(() => {
    setSelected(new Set(role.permissions.map((p) => p.id)))
    setDirty(false)
  }, [role.permissions])

  function toggle(permId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
    setDirty(true)
  }

  function handleSave() {
    updatePermissions.mutate(
      { roleId: role.id, permissionIds: Array.from(selected) },
      { onSuccess: () => setDirty(false) },
    )
  }

  // Group permissions by resource
  const grouped = React.useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of allPermissions) {
      const arr = map.get(p.resource) ?? []
      arr.push(p)
      map.set(p.resource, arr)
    }
    return map
  }, [allPermissions])

  const isAdmin = role.name === 'admin'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{role.label}</CardTitle>
            <Badge variant="secondary" className="text-xs font-mono">{role.name}</Badge>
            {isAdmin && (
              <Badge variant="warning" className="text-xs">Superusuario — acceso total</Badge>
            )}
          </div>
          {!isAdmin && dirty && (
            <Button size="sm" onClick={handleSave} loading={updatePermissions.isPending}>
              <Save className="h-3.5 w-3.5" />
              Guardar cambios
            </Button>
          )}
        </div>
      </CardHeader>

      {!isAdmin && (
        <CardContent>
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([resource, perms]) => (
              <div key={resource}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {RESOURCE_LABELS[resource] ?? resource}
                </p>
                <div className="flex flex-wrap gap-2">
                  {perms.map((p) => {
                    const active = selected.has(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggle(p.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                        )}
                      >
                        {ACTION_LABELS[p.action] ?? p.action}{' '}
                        <span className="opacity-70">({SCOPE_LABELS[p.scope] ?? p.scope})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ---- Page ----

export function RolesPage() {
  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: allPermissions = [], isLoading: permsLoading } = useAllPermissions()

  if (rolesLoading || permsLoading) return <PageLoader />

  // Show admin first, then rest alphabetically by label
  const sorted = [...roles].sort((a, b) => {
    if (a.name === 'admin') return -1
    if (b.name === 'admin') return 1
    return a.label.localeCompare(b.label)
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles y Permisos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura qué puede hacer cada rol en el sistema. Los cambios aplican al instante.
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map((role) => (
          <RoleCard key={role.id} role={role} allPermissions={allPermissions} />
        ))}
      </div>
    </div>
  )
}
