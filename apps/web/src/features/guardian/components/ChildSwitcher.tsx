import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useAuthStore } from '@/store/auth.store'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { getMyChildren } from '../api/guardian.api'

/**
 * Selector de hijo para representantes con más de un alumno vinculado.
 * Solo se muestra cuando el usuario autenticado tiene rol "guardian".
 * Persiste la selección en el auth store.
 */
export function ChildSwitcher() {
  const { hasAnyRole } = usePermissions()
  const isGuardian = hasAnyRole('guardian')

  const { guardianStudentId, setGuardianStudentId } = useAuthStore((s) => ({
    guardianStudentId: s.guardianStudentId,
    setGuardianStudentId: s.setGuardianStudentId,
  }))

  const { data: children = [] } = useQuery({
    queryKey: ['guardian-children'],
    queryFn: getMyChildren,
    enabled: isGuardian,
    staleTime: 5 * 60_000,
  })

  // Auto-seleccionar el primero si aún no hay selección
  useEffect(() => {
    if (children.length > 0 && !guardianStudentId) {
      setGuardianStudentId(children[0].id)
    }
  }, [children, guardianStudentId, setGuardianStudentId])

  // No mostrar si no es guardian o solo tiene un hijo
  if (!isGuardian || children.length <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={guardianStudentId ?? ''} onValueChange={setGuardianStudentId}>
        <SelectTrigger className="h-8 text-sm border-dashed w-48">
          <SelectValue placeholder="Selecciona hijo/a" />
        </SelectTrigger>
        <SelectContent>
          {children.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex flex-col">
                <span className="font-medium">{c.fullName}</span>
                {c.parallel && (
                  <span className="text-xs text-muted-foreground">{c.parallel}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Hook para obtener el studentId activo en el contexto de un guardian. */
export function useGuardianStudentId(): string | null {
  return useAuthStore((s) => s.guardianStudentId)
}
