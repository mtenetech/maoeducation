import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Search, ChevronRight } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useAccessibleStudents } from '../hooks/useStudentFolder'

export function StudentFolderListPage() {
  const navigate = useNavigate()
  const { data: students = [], isLoading } = useAccessibleStudents()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || (s.dni ?? '').toLowerCase().includes(q),
    )
  }, [students, search])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FolderOpen className="h-6 w-6" />
          Carpeta del Estudiante
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Expediente consolidado: matrículas, calificaciones, incidentes, actas y atenciones
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay estudiantes"
          description="No se encontraron estudiantes para los criterios actuales."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => navigate(`/student-folder/${s.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{s.fullName}</p>
                  {s.dni && <p className="text-xs text-muted-foreground">{s.dni}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
