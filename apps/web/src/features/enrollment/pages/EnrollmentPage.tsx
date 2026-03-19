import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { UserPlus, Users, Edit2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { getErrorMessage } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import {
  listEnrollments,
  createEnrollment,
  bulkEnroll,
  updateEnrollmentStatus,
  getYears,
  getParallels,
  getStudents,
  type Enrollment,
  type AcademicYear,
  type Parallel,
  type StudentOption,
} from '../api/enrollment.api'

// ---- Constants ----

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  withdrawn: 'Retirado',
  transferred: 'Trasladado',
}

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  withdrawn: 'destructive',
  transferred: 'warning',
}

const ALL_STATUSES = ['active', 'withdrawn', 'transferred'] as const

// ---- Inline hooks ----

function useYears() {
  return useQuery({
    queryKey: ['years'],
    queryFn: getYears,
  })
}

function useParallels(yearId?: string) {
  return useQuery({
    queryKey: ['parallels', yearId],
    queryFn: () => getParallels(yearId),
    enabled: !!yearId,
  })
}

function useStudents(search: string) {
  return useQuery({
    queryKey: ['students', search],
    queryFn: () => getStudents(search || undefined),
  })
}

function useEnrollments(yearId: string, parallelId: string) {
  return useQuery({
    queryKey: ['enrollments', yearId, parallelId],
    queryFn: () =>
      listEnrollments({
        ...(yearId ? { yearId } : {}),
        ...(parallelId ? { parallelId } : {}),
      }),
    enabled: !!yearId && !!parallelId,
  })
}

function useCreateEnrollment(yearId: string, parallelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { studentId: string; parallelId: string; academicYearId: string }) =>
      createEnrollment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', yearId, parallelId] })
      toast.success('Estudiante matriculado correctamente')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

function useBulkEnroll(yearId: string, parallelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { studentIds: string[]; parallelId: string; academicYearId: string }) =>
      bulkEnroll(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['enrollments', yearId, parallelId] })
      toast.success(
        `${result.created} matriculados, ${result.skipped} omitidos (ya matriculados)`,
      )
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

function useUpdateStatus(yearId: string, parallelId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateEnrollmentStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', yearId, parallelId] })
      toast.success('Estado actualizado correctamente')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ---- StatusDropdown sub-component ----

interface StatusDropdownProps {
  enrollment: Enrollment
  onUpdate: (id: string, status: string) => void
  isPending: boolean
}

function StatusDropdown({ enrollment, onUpdate, isPending }: StatusDropdownProps) {
  return (
    <Select
      value={enrollment.status}
      onValueChange={(val) => onUpdate(enrollment.id, val)}
      disabled={isPending}
    >
      <SelectTrigger className="h-7 text-xs w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---- Student picker sub-component ----

interface StudentPickerProps {
  students: StudentOption[]
  selected: string[]
  onToggle: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  multi?: boolean
}

function StudentPicker({
  students,
  selected,
  onToggle,
  search,
  onSearchChange,
  multi = false,
}: StudentPickerProps) {
  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-2">
      <Input
        placeholder="Buscar estudiante..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="border rounded-md max-h-52 overflow-y-auto divide-y">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No se encontraron estudiantes
          </p>
        )}
        {filtered.map((s) => {
          const isSelected = selected.includes(s.id)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                readOnly
                checked={isSelected}
                className="h-4 w-4 accent-primary shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{s.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
              </div>
            </button>
          )
        })}
      </div>
      {multi && selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} estudiante{selected.length !== 1 ? 's' : ''} seleccionado
          {selected.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ---- Main Page ----

export function EnrollmentPage() {
  // Filter state
  const [yearId, setYearId] = useState('')
  const [parallelId, setParallelId] = useState('')

  // Dialog state
  const [singleOpen, setSingleOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  // Single enrollment form state
  const [singleYearId, setSingleYearId] = useState('')
  const [singleParallelId, setSingleParallelId] = useState('')
  const [singleStudentId, setSingleStudentId] = useState('')
  const [singleSearch, setSingleSearch] = useState('')

  // Bulk enrollment form state
  const [bulkYearId, setBulkYearId] = useState('')
  const [bulkParallelId, setBulkParallelId] = useState('')
  const [bulkStudentIds, setBulkStudentIds] = useState<string[]>([])
  const [bulkSearch, setBulkSearch] = useState('')

  // Queries
  const { data: years = [], isLoading: yearsLoading } = useYears()
  const { data: parallels = [] } = useParallels(yearId)
  const { data: singleParallels = [] } = useParallels(singleYearId)
  const { data: bulkParallels = [] } = useParallels(bulkYearId)
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments(yearId, parallelId)
  const { data: students = [] } = useStudents('')

  // Mutations
  const createMutation = useCreateEnrollment(yearId, parallelId)
  const bulkMutation = useBulkEnroll(yearId, parallelId)
  const statusMutation = useUpdateStatus(yearId, parallelId)

  // Reset parallel when year changes
  useEffect(() => {
    setParallelId('')
  }, [yearId])

  useEffect(() => {
    setSingleParallelId('')
  }, [singleYearId])

  useEffect(() => {
    setBulkParallelId('')
    setBulkStudentIds([])
  }, [bulkYearId])

  function openSingleDialog() {
    setSingleYearId(yearId)
    setSingleParallelId(parallelId)
    setSingleStudentId('')
    setSingleSearch('')
    setSingleOpen(true)
  }

  function openBulkDialog() {
    setBulkYearId(yearId)
    setBulkParallelId(parallelId)
    setBulkStudentIds([])
    setBulkSearch('')
    setBulkOpen(true)
  }

  function handleSingleSubmit() {
    if (!singleYearId || !singleParallelId || !singleStudentId) return
    createMutation.mutate(
      { studentId: singleStudentId, parallelId: singleParallelId, academicYearId: singleYearId },
      { onSuccess: () => setSingleOpen(false) },
    )
  }

  function handleBulkSubmit() {
    if (!bulkYearId || !bulkParallelId || bulkStudentIds.length === 0) return
    bulkMutation.mutate(
      { studentIds: bulkStudentIds, parallelId: bulkParallelId, academicYearId: bulkYearId },
      { onSuccess: () => setBulkOpen(false) },
    )
  }

  function toggleSingleStudent(id: string) {
    setSingleStudentId((prev) => (prev === id ? '' : id))
  }

  function toggleBulkStudent(id: string) {
    setBulkStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  // Table columns
  const columns: ColumnDef<Enrollment, unknown>[] = [
    {
      id: 'estudiante',
      header: 'Estudiante',
      cell: ({ row }) => {
        const { profile } = row.original.student
        const fullName = `${profile.firstName} ${profile.lastName}`
        return (
          <div>
            <p className="font-medium text-sm leading-none">{fullName}</p>
            {profile.dni && (
              <p className="text-xs text-muted-foreground mt-0.5">CI: {profile.dni}</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'paralelo',
      header: 'Paralelo',
      cell: ({ row }) => {
        const { parallel } = row.original
        return (
          <span className="text-sm">
            {parallel.level.name} - {parallel.name}
          </span>
        )
      },
    },
    {
      id: 'año',
      header: 'Año',
      cell: ({ row }) => {
        const { academicYear } = row.original
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{academicYear.name}</span>
            {academicYear.isActive && (
              <Badge variant="success" className="text-xs py-0">
                Activo
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'fecha',
      header: 'Fecha matrícula',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.enrolledAt)}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'}>
          {STATUS_LABEL[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <StatusDropdown
          enrollment={row.original}
          onUpdate={(id, status) => statusMutation.mutate({ id, status })}
          isPending={statusMutation.isPending}
        />
      ),
    },
  ]

  if (yearsLoading) return <PageLoader />

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona la matriculación de estudiantes en paralelos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openBulkDialog}>
            <Users className="h-4 w-4" />
            Matrícula Masiva
          </Button>
          <Button onClick={openSingleDialog}>
            <UserPlus className="h-4 w-4" />
            Nueva Matrícula
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-52">
          <Select value={yearId} onValueChange={setYearId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar año..." />
            </SelectTrigger>
            <SelectContent>
              {years.map((y: AcademicYear) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? ' (Activo)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <Select value={parallelId} onValueChange={setParallelId} disabled={!yearId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar paralelo..." />
            </SelectTrigger>
            <SelectContent>
              {parallels.map((p: Parallel) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.level.name} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={enrollments}
        isLoading={enrollmentsLoading}
        emptyMessage={
          !yearId || !parallelId
            ? 'Selecciona un año y paralelo para ver las matrículas'
            : 'No hay estudiantes matriculados en este paralelo'
        }
        emptyDescription={
          yearId && parallelId
            ? 'Usa el botón "Nueva Matrícula" para agregar estudiantes'
            : undefined
        }
      />

      {/* ---- Single Enrollment Dialog ---- */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Matrícula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Año lectivo *</Label>
              <Select value={singleYearId} onValueChange={setSingleYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año..." />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y: AcademicYear) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                      {y.isActive ? ' (Activo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paralelo *</Label>
              <Select
                value={singleParallelId}
                onValueChange={setSingleParallelId}
                disabled={!singleYearId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paralelo..." />
                </SelectTrigger>
                <SelectContent>
                  {singleParallels.map((p: Parallel) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.level.name} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estudiante *</Label>
              <StudentPicker
                students={students}
                selected={singleStudentId ? [singleStudentId] : []}
                onToggle={toggleSingleStudent}
                search={singleSearch}
                onSearchChange={setSingleSearch}
                multi={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSingleSubmit}
              disabled={!singleYearId || !singleParallelId || !singleStudentId}
              loading={createMutation.isPending}
            >
              Matricular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Bulk Enrollment Dialog ---- */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Matrícula Masiva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Año lectivo *</Label>
              <Select value={bulkYearId} onValueChange={setBulkYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año..." />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y: AcademicYear) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                      {y.isActive ? ' (Activo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paralelo *</Label>
              <Select
                value={bulkParallelId}
                onValueChange={setBulkParallelId}
                disabled={!bulkYearId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paralelo..." />
                </SelectTrigger>
                <SelectContent>
                  {bulkParallels.map((p: Parallel) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.level.name} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estudiantes *</Label>
              <StudentPicker
                students={students}
                selected={bulkStudentIds}
                onToggle={toggleBulkStudent}
                search={bulkSearch}
                onSearchChange={setBulkSearch}
                multi={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={!bulkYearId || !bulkParallelId || bulkStudentIds.length === 0}
              loading={bulkMutation.isPending}
            >
              Matricular {bulkStudentIds.length > 0 ? `${bulkStudentIds.length} estudiantes` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
