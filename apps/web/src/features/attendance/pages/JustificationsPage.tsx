import * as React from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Card } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import {
  getAttendance,
  getAssignments,
  type AttendanceEntry,
} from '@/features/attendance/api/attendance.api'
import { apiPost } from '@/shared/lib/api-client'

// ---- Types ----

interface CreateJustificationPayload {
  studentId: string
  attendanceRecordIds: string[]
  reason: string
  documentUrl?: string
}

// ---- API ----

function createJustification(payload: CreateJustificationPayload) {
  return apiPost('attendance/justifications', payload)
}

// ---- Main Page ----

export function JustificationsPage() {
  const qc = useQueryClient()

  const [selectedAssignment, setSelectedAssignment] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split('T')[0],
  )
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')

  // ---- Queries ----

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => getAssignments(),
  })

  const {
    data: attendanceData = [],
    isLoading: attendanceLoading,
  } = useQuery({
    queryKey: ['attendance', selectedAssignment, selectedDate],
    queryFn: () => getAttendance(selectedAssignment, selectedDate),
    enabled: !!selectedAssignment && !!selectedDate,
  })

  // ---- Filter absent/late records ----

  const absentEntries = React.useMemo(
    () =>
      attendanceData.filter(
        (e: AttendanceEntry) =>
          e.record?.status === 'absent' || e.record?.status === 'late',
      ),
    [attendanceData],
  )

  // ---- Mutation ----

  const justifyMutation = useMutation({
    mutationFn: () => {
      const selected = absentEntries.filter((e: AttendanceEntry) =>
        selectedStudentIds.has(e.student.id),
      )

      // Group by student — each student gets one justification with their record ids
      return Promise.all(
        selected.map((e: AttendanceEntry) =>
          createJustification({
            studentId: e.student.id,
            attendanceRecordIds: e.record ? [e.record.id] : [],
            reason,
            documentUrl: documentUrl || undefined,
          }),
        ),
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', selectedAssignment, selectedDate] })
      toast.success('Justificación(es) creada(s) correctamente')
      setDialogOpen(false)
      setSelectedStudentIds(new Set())
      setReason('')
      setDocumentUrl('')
    },
    onError: () => {
      toast.error('Error al crear la justificación')
    },
  })

  // ---- Handlers ----

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedStudentIds.size === absentEntries.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(absentEntries.map((e: AttendanceEntry) => e.student.id)))
    }
  }

  function handleAssignmentChange(value: string) {
    setSelectedAssignment(value)
    setSelectedStudentIds(new Set())
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedDate(e.target.value)
    setSelectedStudentIds(new Set())
  }

  function assignmentLabel(a: (typeof assignments)[number]) {
    return `${a.parallel.level.name} - ${a.parallel.name} / ${a.subject.name}`
  }

  const selectedEntries = absentEntries.filter((e: AttendanceEntry) =>
    selectedStudentIds.has(e.student.id),
  )

  // ---- Status label ----

  const STATUS_LABEL: Record<string, string> = {
    absent: 'Ausente',
    late: 'Tarde',
  }

  // ---- Render ----

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Justificaciones de Ausencia</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona las justificaciones de ausencia e inasistencia de los estudiantes
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-72">
          <Select value={selectedAssignment} onValueChange={handleAssignmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar asignación" />
            </SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {assignmentLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {selectedStudentIds.size > 0 && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="ml-auto"
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            Crear Justificación ({selectedStudentIds.size})
          </Button>
        )}
      </div>

      {/* Content area */}
      {!selectedAssignment ? (
        <EmptyState
          icon={Users}
          title="Selecciona una asignación y fecha"
          description="Elige la asignación y la fecha para ver los estudiantes ausentes o tardíos"
        />
      ) : attendanceLoading ? (
        <PageLoader />
      ) : absentEntries.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Sin ausencias"
          description="No hay estudiantes ausentes o tardíos para esta asignación en esta fecha"
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.size === absentEntries.length}
                    onChange={toggleAll}
                    className="rounded border-input"
                  />
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absentEntries.map((entry: AttendanceEntry, index: number) => {
                const studentId = entry.student.id
                const isSelected = selectedStudentIds.has(studentId)
                const fullName = `${entry.student.profile.firstName} ${entry.student.profile.lastName}`
                const status = entry.record?.status ?? 'absent'

                return (
                  <TableRow
                    key={studentId}
                    className={isSelected ? 'bg-muted/50' : ''}
                    onClick={() => toggleStudent(studentId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(studentId)}
                        className="rounded border-input"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{fullName}</p>
                        {entry.student.profile.dni && (
                          <p className="text-xs text-muted-foreground">
                            {entry.student.profile.dni}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          status === 'absent'
                            ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-300'
                            : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-700 border-yellow-300'
                        }
                      >
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.record?.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Justification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Justificación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Selected students (read-only) */}
            <div>
              <Label className="text-sm font-medium">Estudiantes seleccionados</Label>
              <div className="mt-1.5 border rounded-md p-3 space-y-1 max-h-40 overflow-y-auto bg-muted/30">
                {selectedEntries.map((e: AttendanceEntry) => (
                  <p key={e.student.id} className="text-sm">
                    {e.student.profile.firstName} {e.student.profile.lastName}
                  </p>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motivo *</Label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe el motivo de la justificación..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Document URL */}
            <div className="space-y-1.5">
              <Label htmlFor="documentUrl">URL del documento</Label>
              <Input
                id="documentUrl"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={justifyMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => justifyMutation.mutate()}
              disabled={!reason.trim() || justifyMutation.isPending}
            >
              {justifyMutation.isPending ? 'Justificando...' : 'Justificar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
