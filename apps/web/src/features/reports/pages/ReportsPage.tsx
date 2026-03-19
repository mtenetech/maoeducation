import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, FileText, BarChart2, ClipboardList } from 'lucide-react'
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
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { apiGet } from '@/shared/lib/api-client'
import { getGradesReport, getAttendanceReport, getEnrollmentReport } from '../api/reports.api'
import type { GradesReportData, AttendanceReportData, EnrollmentReportData } from '../api/reports.api'

type Tab = 'grades' | 'attendance' | 'enrollment'

interface Assignment {
  id: string
  subject: { name: string }
  parallel: { name: string; level: { name: string } }
  academicYear: { id: string; name: string }
}
interface AcademicYear { id: string; name: string; isActive: boolean }
interface Parallel { id: string; name: string; level: { name: string } }
interface Period { id: string; name: string; periodNumber: number }

export function ReportsPage() {
  const [tab, setTab] = React.useState<Tab>('grades')

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">Genera e imprime reportes del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { id: 'grades' as const, label: 'Calificaciones', icon: BarChart2 },
          { id: 'attendance' as const, label: 'Asistencia', icon: ClipboardList },
          { id: 'enrollment' as const, label: 'Nómina', icon: FileText },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'grades' && <GradesReportTab />}
      {tab === 'attendance' && <AttendanceReportTab />}
      {tab === 'enrollment' && <EnrollmentReportTab />}
    </div>
  )
}

// ── Grades Report ────────────────────────────────────────────

function GradesReportTab() {
  const [assignmentId, setAssignmentId] = React.useState('')
  const [periodId, setPeriodId] = React.useState('')
  const [enabled, setEnabled] = React.useState(false)

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-report'],
    queryFn: () => apiGet<Assignment[]>('academic/course-assignments'),
  })

  const selected = assignments.find((a) => a.id === assignmentId)

  const { data: periods = [] } = useQuery({
    queryKey: ['periods-report', selected?.academicYear.id],
    queryFn: () => apiGet<Period[]>(`academic/years/${selected!.academicYear.id}/periods`),
    enabled: !!selected,
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-grades', assignmentId, periodId],
    queryFn: () => getGradesReport({ courseAssignmentId: assignmentId, periodId }),
    enabled: enabled && !!assignmentId && !!periodId,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 w-72">
          <Label>Asignación</Label>
          <Select value={assignmentId} onValueChange={(v) => { setAssignmentId(v); setPeriodId(''); setEnabled(false) }}>
            <SelectTrigger><SelectValue placeholder="Selecciona asignación" /></SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.parallel.level.name} {a.parallel.name} / {a.subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 w-48">
          <Label>Período</Label>
          <Select value={periodId} onValueChange={(v) => { setPeriodId(v); setEnabled(false) }} disabled={!assignmentId}>
            <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEnabled(true)} disabled={!assignmentId || !periodId}>
          Generar reporte
        </Button>
      </div>

      {isLoading && <PageLoader />}
      {report && !isLoading && <GradesReportView data={report} />}
      {!enabled && <EmptyState icon={BarChart2} title="Selecciona asignación y período" description="Luego haz clic en Generar reporte" />}
    </div>
  )
}

function GradesReportView({ data }: { data: GradesReportData }) {
  const allActivities = data.insumos.flatMap((ins) =>
    ins.activities.map((act) => ({ ...act, insumoName: ins.name }))
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {data.assignment.parallel.level.name} {data.assignment.parallel.name} ·{' '}
          {data.assignment.subject.name} · {data.assignment.academicYear.name}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border px-2 py-1.5 text-left font-medium w-8">#</th>
              <th className="border px-2 py-1.5 text-left font-medium min-w-[160px]">Estudiante</th>
              {allActivities.map((act) => (
                <th key={act.id} className="border px-2 py-1.5 text-center font-medium min-w-[56px]">
                  <div className="text-[10px] text-muted-foreground">{act.insumoName}</div>
                  <div>{act.name}</div>
                  <div className="text-[10px] font-normal">/{Number(act.maxScore)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((s, i) => (
              <tr key={s.student.id} className="hover:bg-muted/30">
                <td className="border px-2 py-1 text-center">{i + 1}</td>
                <td className="border px-2 py-1">
                  {s.student.profile.lastName} {s.student.profile.firstName}
                  {s.student.profile.dni && (
                    <span className="text-muted-foreground ml-1 text-[10px]">{s.student.profile.dni}</span>
                  )}
                </td>
                {allActivities.map((act) => (
                  <td key={act.id} className="border px-2 py-1 text-center">
                    {s.grades[act.id] != null ? Number(s.grades[act.id]).toFixed(2) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{data.students.length} estudiantes · {allActivities.length} actividades</p>
    </div>
  )
}

// ── Attendance Report ────────────────────────────────────────

const STATUS_SHORT: Record<string, string> = { present: 'P', absent: 'A', late: 'T', excused: 'J' }
const STATUS_CLASS: Record<string, string> = {
  present: 'text-green-600',
  absent: 'text-red-600 font-semibold',
  late: 'text-yellow-600',
  excused: 'text-blue-600',
}

function AttendanceReportTab() {
  const [assignmentId, setAssignmentId] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [enabled, setEnabled] = React.useState(false)

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-att-report'],
    queryFn: () => apiGet<Assignment[]>('academic/course-assignments'),
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-attendance', assignmentId, startDate, endDate],
    queryFn: () => getAttendanceReport({ courseAssignmentId: assignmentId, startDate, endDate }),
    enabled: enabled && !!assignmentId && !!startDate && !!endDate,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 w-72">
          <Label>Asignación</Label>
          <Select value={assignmentId} onValueChange={(v) => { setAssignmentId(v); setEnabled(false) }}>
            <SelectTrigger><SelectValue placeholder="Selecciona asignación" /></SelectTrigger>
            <SelectContent>
              {assignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.parallel.level.name} {a.parallel.name} / {a.subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Desde</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setEnabled(false) }} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label>Hasta</Label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setEnabled(false) }} className="w-40" />
        </div>
        <Button onClick={() => setEnabled(true)} disabled={!assignmentId || !startDate || !endDate}>
          Generar reporte
        </Button>
      </div>

      {isLoading && <PageLoader />}
      {report && !isLoading && <AttendanceReportView data={report} />}
      {!enabled && <EmptyState icon={ClipboardList} title="Selecciona asignación y rango de fechas" description="Luego haz clic en Generar reporte" />}
    </div>
  )
}

function AttendanceReportView({ data }: { data: AttendanceReportData }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium">
            {data.assignment.parallel.level.name} {data.assignment.parallel.name} · {data.assignment.subject.name}
          </p>
          <p className="text-xs text-muted-foreground">P=Presente · A=Ausente · T=Tarde · J=Justificado</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border px-2 py-1.5 text-left font-medium w-8">#</th>
              <th className="border px-2 py-1.5 text-left font-medium min-w-[160px]">Estudiante</th>
              {data.dates.map((d) => (
                <th key={d} className="border px-1 py-1.5 text-center font-medium min-w-[36px]">
                  {new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </th>
              ))}
              <th className="border px-2 py-1.5 text-center text-green-700">P</th>
              <th className="border px-2 py-1.5 text-center text-red-600">A</th>
              <th className="border px-2 py-1.5 text-center text-yellow-600">T</th>
              <th className="border px-2 py-1.5 text-center text-blue-600">J</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s, i) => {
              const counts = { present: 0, absent: 0, late: 0, excused: 0 }
              for (const d of data.dates) {
                const st = s.records[d] as keyof typeof counts | undefined
                if (st && st in counts) counts[st]++
              }
              return (
                <tr key={s.student.id} className="hover:bg-muted/30">
                  <td className="border px-2 py-1 text-center">{i + 1}</td>
                  <td className="border px-2 py-1">{s.student.profile.lastName} {s.student.profile.firstName}</td>
                  {data.dates.map((d) => (
                    <td key={d} className={`border px-1 py-1 text-center ${STATUS_CLASS[s.records[d]] ?? 'text-muted-foreground'}`}>
                      {STATUS_SHORT[s.records[d]] ?? '·'}
                    </td>
                  ))}
                  <td className="border px-2 py-1 text-center text-green-600">{counts.present}</td>
                  <td className="border px-2 py-1 text-center text-red-600">{counts.absent}</td>
                  <td className="border px-2 py-1 text-center text-yellow-600">{counts.late}</td>
                  <td className="border px-2 py-1 text-center text-blue-600">{counts.excused}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Enrollment Report ────────────────────────────────────────

function EnrollmentReportTab() {
  const [yearId, setYearId] = React.useState('')
  const [parallelId, setParallelId] = React.useState('')
  const [enabled, setEnabled] = React.useState(false)

  const { data: years = [] } = useQuery({
    queryKey: ['years-report'],
    queryFn: () => apiGet<AcademicYear[]>('academic/years'),
  })

  const { data: parallels = [] } = useQuery({
    queryKey: ['parallels-report', yearId],
    queryFn: () => apiGet<Parallel[]>('academic/parallels', { yearId }),
    enabled: !!yearId,
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-enrollment', yearId, parallelId],
    queryFn: () => getEnrollmentReport({ yearId, ...(parallelId ? { parallelId } : {}) }),
    enabled: enabled && !!yearId,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 w-52">
          <Label>Año lectivo</Label>
          <Select value={yearId} onValueChange={(v) => { setYearId(v); setParallelId(''); setEnabled(false) }}>
            <SelectTrigger><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 w-52">
          <Label>Paralelo (opcional)</Label>
          <Select value={parallelId || '__all__'} onValueChange={(v) => { setParallelId(v === '__all__' ? '' : v); setEnabled(false) }} disabled={!yearId}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los paralelos</SelectItem>
              {parallels.map((p) => <SelectItem key={p.id} value={p.id}>{p.level.name} {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEnabled(true)} disabled={!yearId}>Generar nómina</Button>
      </div>

      {isLoading && <PageLoader />}
      {report && !isLoading && <EnrollmentReportView data={report} />}
      {!enabled && <EmptyState icon={FileText} title="Selecciona un año lectivo" description="Luego haz clic en Generar nómina" />}
    </div>
  )
}

function EnrollmentReportView({ data }: { data: EnrollmentReportData }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Año: {data.year.name} · {data.totalEnrollments} estudiantes</p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      {data.parallels.map(({ parallel, enrollments }) => (
        <div key={parallel.id} className="space-y-2">
          <h3 className="font-semibold text-sm">
            {parallel.level.name} — Paralelo {parallel.name} ({enrollments.length} estudiantes)
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-2 py-1.5 text-left font-medium w-8">#</th>
                  <th className="border px-2 py-1.5 text-left font-medium">Apellidos</th>
                  <th className="border px-2 py-1.5 text-left font-medium">Nombres</th>
                  <th className="border px-2 py-1.5 text-left font-medium">Cédula</th>
                  <th className="border px-2 py-1.5 text-left font-medium">Fecha nac.</th>
                  <th className="border px-2 py-1.5 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="border px-2 py-1 text-center">{i + 1}</td>
                    <td className="border px-2 py-1">{e.student.profile.lastName}</td>
                    <td className="border px-2 py-1">{e.student.profile.firstName}</td>
                    <td className="border px-2 py-1">{e.student.profile.dni ?? '—'}</td>
                    <td className="border px-2 py-1">
                      {e.student.profile.birthDate
                        ? new Date(e.student.profile.birthDate).toLocaleDateString('es-ES')
                        : '—'}
                    </td>
                    <td className="border px-2 py-1">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
