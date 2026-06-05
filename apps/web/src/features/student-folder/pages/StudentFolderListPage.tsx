import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useAcademicYears, useParallels } from '@/features/academic/hooks/useAcademic'
import { useAccessibleStudents } from '../hooks/useStudentFolder'

const ALL = '__all__'
const PAGE_SIZE = 20

export function StudentFolderListPage() {
  const navigate = useNavigate()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [parallelId, setParallelId] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  // Debounce de la búsqueda (nombre / cédula)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Paralelos del año activo para el filtro por grado
  const { data: years = [] } = useAcademicYears()
  const activeYear = years.find((y) => y.isActive) ?? years[0]
  const { data: parallels = [] } = useParallels(activeYear?.id)

  const params = useMemo(
    () => ({
      search: search || undefined,
      parallelId: parallelId !== ALL ? parallelId : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, parallelId, page],
  )

  const { data, isLoading, isFetching } = useAccessibleStudents(params)
  const students = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="pl-9"
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={parallelId}
            onValueChange={(v) => {
              setParallelId(v)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los grados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los grados</SelectItem>
              {parallels.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.level?.name ? `${p.level.name} ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : students.length === 0 ? (
        <EmptyState
          title="No hay estudiantes"
          description="No se encontraron estudiantes para los criterios actuales."
        />
      ) : (
        <>
          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((s) => (
                <Card
                  key={s.id}
                  className="cursor-pointer transition-colors hover:bg-accent"
                  onClick={() => navigate(`/student-folder/${s.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.dni ?? 'Sin cédula'}
                        {(s.levelName || s.parallelName) &&
                          ` · ${[s.levelName, s.parallelName].filter(Boolean).join(' ')}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              {total} estudiante{total === 1 ? '' : 's'} · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
