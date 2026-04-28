import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, GraduationCap, BarChart3, Settings2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { getErrorMessage, cn } from '@/shared/lib/utils'
import { activitiesApi, type StudentGrade, type GradeInput } from '@/features/activities/api/activities.api'
import { useTeacherDefaults } from '@/features/academic/hooks/useTeacherDefaults'
import { getGradesReport, getMyGrades, type GradesReportData } from '@/features/reports/api/reports.api'
import { academicApi } from '@/features/academic/api/academic.api'
import { usePermissions } from '@/shared/hooks/usePermissions'

// ---- Query keys ----
const gradeKeys = {
  byActivity: (activityId: string) => ['grades', 'activity', activityId] as const,
  summary: (cid: string, pid: string) => ['grades', 'summary', cid, pid] as const,
}

function useGradesByActivity(activityId: string) {
  return useQuery({
    queryKey: gradeKeys.byActivity(activityId),
    queryFn: () => activitiesApi.getGradesByActivity(activityId),
    enabled: !!activityId,
  })
}

function useGradesSummary(courseAssignmentId: string, periodId: string) {
  return useQuery({
    queryKey: gradeKeys.summary(courseAssignmentId, periodId),
    queryFn: () => activitiesApi.getGradesSummary(courseAssignmentId, periodId),
    enabled: !!courseAssignmentId && !!periodId,
  })
}

function useBulkSaveGrades() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grades: GradeInput[]) => activitiesApi.bulkSaveGrades(grades),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] })
      toast.success('Notas guardadas correctamente')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

// ---- Tabs ----
type Tab = 'entry' | 'summary'

// ---- Grade Row Component ----
interface GradeRowProps {
  grade: StudentGrade
  maxScore: number
  localScore: number | null | undefined
  isModified: boolean
  onChange: (studentId: string, value: number | null) => void
}

function GradeRow({ grade, maxScore, localScore, isModified, onChange }: GradeRowProps) {
  const displayScore = localScore !== undefined ? localScore : grade.score

  return (
    <TableRow className={cn(isModified && 'bg-amber-50/50')}>
      <TableCell className="font-medium">{grade.studentName}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={maxScore}
            step={0.01}
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            value={displayScore ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value)
              onChange(grade.studentId, val)
            }}
            className={cn(
              'w-20 text-center text-base md:w-24 md:text-sm',
              isModified && 'border-amber-400 focus-visible:ring-amber-400',
            )}
            placeholder="—"
          />
          <span className="text-xs text-muted-foreground">/ {maxScore}</span>
        </div>
      </TableCell>
      <TableCell>
        {isModified && (
          <Badge variant="warning" className="text-xs">
            Modificado
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}

// ---- Grades Grid (Excel-like) ----

function scoreColor(score: number | null | undefined, max: number) {
  if (score == null) return 'text-muted-foreground'
  const pct = score / max
  if (pct >= 0.9) return 'text-emerald-700 font-semibold'
  if (pct >= 0.7) return 'text-blue-700'
  if (pct >= 0.5) return 'text-amber-600'
  return 'text-red-600 font-semibold'
}

function GradesGrid({ data }: { data: GradesReportData }) {
  const { insumos, students } = data
  const allActivities = insumos.flatMap((ins) => ins.activities.map((a) => ({ ...a, insumoName: ins.name })))

  if (allActivities.length === 0) {
    return (
      <EmptyState icon={BarChart3} title="Sin actividades" description="No hay actividades publicadas en este período" />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm border-collapse w-full">
        <thead>
          {/* Row 1: Insumo headers */}
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-20 bg-muted/60 border border-border px-3 py-2 text-left font-semibold min-w-[180px]">
              Estudiante
            </th>
            {insumos.map((ins) => (
              <th
                key={ins.id}
                colSpan={ins.activities.length + 1}
                className="border border-border px-2 py-1.5 text-center font-semibold text-primary whitespace-nowrap"
              >
                {ins.name}
                {ins.weight != null && Number(ins.weight) > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">({ins.weight}%)</span>
                )}
              </th>
            ))}
            <th className="border border-border px-3 py-2 text-center font-semibold bg-muted">
              Total
            </th>
          </tr>
          {/* Row 2: Activity headers */}
          <tr className="bg-muted/40">
            <th className="sticky left-0 z-20 bg-muted/40 border border-border px-3 py-1.5" />
            {insumos.map((ins) =>
              ins.activities.map((act) => (
                <th
                  key={act.id}
                  className="border border-border px-2 py-1.5 text-center font-medium whitespace-nowrap max-w-[90px]"
                  title={act.name}
                >
                  <div className="truncate max-w-[80px] mx-auto text-xs">{act.name}</div>
                  <div className="text-[10px] text-muted-foreground">/{act.maxScore}</div>
                </th>
              )).concat(
                <th key={`avg-${ins.id}`} className="border border-border px-2 py-1.5 text-center text-xs text-muted-foreground bg-muted/30">
                  Prom.
                </th>
              )
            )}
            <th className="border border-border px-3 py-1.5 text-center text-xs text-muted-foreground bg-muted/20" />
          </tr>
        </thead>
        <tbody>
          {students.map((row, i) => {
            const { student, grades } = row
            const fullName = `${student.profile.lastName}, ${student.profile.firstName}`

            // Compute insumo averages and overall
            const insumoAvgs = insumos.map((ins) => {
              const hasAny = ins.activities.some((a) => grades[a.id] != null)
              if (!hasAny) return null
              const maxTotal = ins.activities.reduce((sum, a) => sum + Number(a.maxScore), 0)
              if (maxTotal === 0) return null
              const scored = ins.activities.reduce((sum, a) => sum + (grades[a.id] != null ? Number(grades[a.id]) : 0), 0)
              return (scored / maxTotal) * 10
            })

            const validAvgs = insumoAvgs.filter((v): v is number => v != null)
            const overall = validAvgs.length > 0 ? validAvgs.reduce((s, v) => s + v, 0) / validAvgs.length : null

            return (
              <tr key={student.id} className={cn('hover:bg-muted/20', i % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
                <td className="sticky left-0 z-10 bg-inherit border border-border px-3 py-2 font-medium whitespace-nowrap">
                  {fullName}
                </td>
                {insumos.map((ins, idx) =>
                  ins.activities.map((act) => {
                    const score = grades[act.id] ?? null
                    return (
                      <td key={act.id} className="border border-border px-2 py-2 text-center tabular-nums">
                        <span className={scoreColor(score, act.maxScore)}>
                          {score ?? '—'}
                        </span>
                      </td>
                    )
                  }).concat(
                    <td key={`avg-${ins.id}-${student.id}`} className="border border-border px-2 py-2 text-center bg-muted/20 tabular-nums">
                      <span className={scoreColor(insumoAvgs[idx], 10)}>
                        {insumoAvgs[idx] != null ? insumoAvgs[idx]!.toFixed(1) : '—'}
                      </span>
                    </td>
                  )
                )}
                <td className="border border-border px-3 py-2 text-center font-semibold tabular-nums bg-muted/20">
                  <span className={scoreColor(overall, 10)}>
                    {overall != null ? overall.toFixed(2) : '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---- Compact Grid ----

function calcInsumoAvg(insumo: GradesReportData['insumos'][0], grades: Record<string, number | null>): number | null {
  if (insumo.activities.length === 0) return null
  const maxTotal = insumo.activities.reduce((s, a) => s + Number(a.maxScore), 0)
  if (maxTotal === 0) return null
  const hasAny = insumo.activities.some((a) => grades[a.id] !== undefined && grades[a.id] !== null)
  if (!hasAny) return null
  const scored = insumo.activities.reduce((s, a) => {
    const v = grades[a.id]
    return s + (v != null ? Number(v) : 0)
  }, 0)
  return (scored / maxTotal) * 10
}

function calcActivitiesAvg(
  activities: GradesReportData['insumos'][0]['activities'],
  grades: Record<string, number | null>,
): number | null {
  if (activities.length === 0) return null
  const maxTotal = activities.reduce((s, a) => s + Number(a.maxScore), 0)
  if (maxTotal === 0) return null
  if (!activities.some((a) => grades[a.id] !== undefined && grades[a.id] !== null)) return null
  const scored = activities.reduce((s, a) => s + (grades[a.id] != null ? Number(grades[a.id]) : 0), 0)
  return (scored / maxTotal) * 10
}

function calcCompactTotal(regularAvgs: (number | null)[], examAvg: number | null, examWeight: number): number | null {
  const regularWeight = 100 - examWeight
  const validRegular = regularAvgs.filter((v): v is number => v != null)
  const regularMean = validRegular.length > 0 ? validRegular.reduce((s, v) => s + v, 0) / validRegular.length : null

  if (regularMean != null && examAvg != null) return regularMean * (regularWeight / 100) + examAvg * (examWeight / 100)
  if (regularMean != null) return regularMean
  if (examAvg != null) return examAvg
  return null
}

interface CompactGridProps {
  data: GradesReportData
  examWeight: number
  canEditWeight: boolean
  onEditWeight: () => void
}

function CompactGrid({ data, examWeight, canEditWeight, onEditWeight }: CompactGridProps) {
  const { insumos, students } = data
  const regularWeight = 100 - examWeight

  // Collect IDs of all exam-type activities
  const examActivityIds = new Set<string>()
  for (const ins of insumos) {
    for (const act of ins.activities) {
      if (act.activityType.code === 'exam') examActivityIds.add(act.id)
    }
  }

  // All regular activities (non-exam) across all insumos (excluding 'no-insumo')
  const regularActivities = insumos
    .filter((i) => i.id !== 'no-insumo')
    .flatMap((i) => i.activities.filter((a) => !examActivityIds.has(a.id)))

  // All exam activities
  const examActivities = insumos.flatMap((i) => i.activities).filter((a) => examActivityIds.has(a.id))
  const hasExam = examActivities.length > 0
  const hasRegular = regularActivities.length > 0

  if (!hasRegular && !hasExam) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin actividades publicadas"
        description="Publica actividades para ver el resumen compacto."
      />
    )
  }

  // Named insumos with only their non-exam activities (for individual columns)
  const regularInsumos = insumos
    .filter((i) => i.id !== 'no-insumo')
    .map((i) => ({ ...i, activities: i.activities.filter((a) => !examActivityIds.has(a.id)) }))
    .filter((i) => i.activities.length > 0)

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-20 bg-muted/60 border border-border px-3 py-2 text-left font-semibold min-w-[180px]">
              Estudiante
            </th>
            {regularInsumos.map((ins) => (
              <th key={ins.id} className="border border-border px-3 py-2 text-center font-semibold text-primary whitespace-nowrap">
                {ins.name}
                <div className="text-[10px] font-normal text-muted-foreground">promedio</div>
              </th>
            ))}
            {hasRegular && (
              <th className="border border-border px-3 py-2 text-center font-semibold text-primary whitespace-nowrap bg-blue-50/50">
                Insumos
                <div className="text-[10px] font-normal text-muted-foreground">
                  {hasExam ? `${regularWeight}%` : 'promedio'}
                </div>
              </th>
            )}
            {hasExam && (
              <th className="border border-border px-3 py-2 text-center font-semibold text-primary whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  Examen
                  {canEditWeight && (
                    <button
                      type="button"
                      onClick={onEditWeight}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Cambiar peso del examen"
                    >
                      <Settings2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="text-[10px] font-normal text-muted-foreground">{examWeight}%</div>
              </th>
            )}
            <th className="border border-border px-3 py-2 text-center font-semibold bg-muted whitespace-nowrap">
              Total
              {hasExam && <div className="text-[10px] font-normal text-muted-foreground">ponderado</div>}
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((row, i) => {
            const { student, grades } = row
            const fullName = `${student.profile.lastName}, ${student.profile.firstName}`
            const insumoAvgs = regularInsumos.map((ins) => calcInsumoAvg(ins, grades))
            const regularAvg = calcActivitiesAvg(regularActivities, grades)
            const examAvg = calcActivitiesAvg(examActivities, grades)
            const total = calcCompactTotal([regularAvg], examAvg, examWeight)

            return (
              <tr key={student.id} className={cn('hover:bg-muted/20', i % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
                <td className="sticky left-0 z-10 bg-inherit border border-border px-3 py-2 font-medium whitespace-nowrap">
                  {fullName}
                </td>
                {insumoAvgs.map((avg, idx) => (
                  <td key={regularInsumos[idx].id} className="border border-border px-3 py-2 text-center tabular-nums">
                    <span className={scoreColor(avg, 10)}>
                      {avg != null ? avg.toFixed(2) : '—'}
                    </span>
                  </td>
                ))}
                {hasRegular && (
                  <td className="border border-border px-3 py-2 text-center tabular-nums bg-blue-50/50 font-semibold">
                    <span className={scoreColor(regularAvg, 10)}>
                      {regularAvg != null ? regularAvg.toFixed(2) : '—'}
                    </span>
                  </td>
                )}
                {hasExam && (
                  <td className="border border-border px-3 py-2 text-center tabular-nums">
                    <span className={scoreColor(examAvg, 10)}>
                      {examAvg != null ? examAvg.toFixed(2) : '—'}
                    </span>
                  </td>
                )}
                <td className="border border-border px-3 py-2 text-center font-bold tabular-nums bg-muted/20">
                  <span className={scoreColor(total, 10)}>
                    {total != null ? total.toFixed(2) : '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---- Summary Tab ----
type SummaryView = 'compact' | 'full'

interface SummaryTabProps {
  courseAssignmentId: string
  periodId: string
}

function SummaryTab({ courseAssignmentId, periodId }: SummaryTabProps) {
  const [view, setView] = React.useState<SummaryView>('compact')
  const [editingWeight, setEditingWeight] = React.useState(false)
  const [weightInput, setWeightInput] = React.useState('')
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('academic_config:manage')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['grades-grid', courseAssignmentId, periodId],
    queryFn: () => getGradesReport({ courseAssignmentId, periodId }),
    enabled: !!courseAssignmentId && !!periodId,
  })

  const updateWeight = useMutation({
    mutationFn: (w: number) => academicApi.updateExamWeight(courseAssignmentId, w),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades-grid', courseAssignmentId, periodId] })
      setEditingWeight(false)
      toast.success('Peso del examen actualizado')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <PageLoader />

  if (!data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin datos de notas"
        description="No hay actividades o notas registradas para este período"
      />
    )
  }

  const examWeight = data.assignment.examWeight ?? 30
  const totalActivities = data.insumos.reduce((s, i) => s + i.activities.length, 0)

  function handleOpenWeightEdit() {
    setWeightInput(String(examWeight))
    setEditingWeight(true)
  }

  function handleSaveWeight() {
    const val = parseInt(weightInput, 10)
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('El peso debe ser un número entre 0 y 100')
      return
    }
    updateWeight.mutate(val)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
          <span>{data.students.length} estudiantes · {totalActivities} actividades</span>
          {editingWeight && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="font-medium text-foreground">Peso examen:</span>
              <Input
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                pattern="[0-9]*"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="h-7 w-16 px-1 text-center text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveWeight()
                  if (e.key === 'Escape') setEditingWeight(false)
                }}
              />
              <span>%</span>
              <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSaveWeight} disabled={updateWeight.isPending}>
                OK
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingWeight(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
        <div className="flex rounded-md border overflow-hidden text-xs self-start">
          <button
            type="button"
            onClick={() => setView('compact')}
            className={cn(
              'px-3 py-1.5 font-medium transition-colors',
              view === 'compact' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
            )}
          >
            Compacto
          </button>
          <button
            type="button"
            onClick={() => setView('full')}
            className={cn(
              'px-3 py-1.5 font-medium transition-colors border-l',
              view === 'full' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
            )}
          >
            Sábana total
          </button>
        </div>
      </div>
      {view === 'compact'
        ? <CompactGrid data={data} examWeight={examWeight} canEditWeight={canManage} onEditWeight={handleOpenWeightEdit} />
        : <GradesGrid data={data} />
      }
    </div>
  )
}

// ---- Main Page ----

// ---- Student Grades View ----
function StudentGradesView({ periodId }: { periodId: string }) {
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['my-grades', periodId],
    queryFn: () => getMyGrades({ periodId }),
    enabled: !!periodId,
  })

  if (isLoading) return <PageLoader />
  if (!subjects || subjects.length === 0)
    return <EmptyState icon={BarChart3} title="Sin datos" description="No hay notas registradas para este período" />

  // Collect all unique insumo column names (preserve order from first subject)
  const allInsumoNames = subjects[0]?.insumoColumns.map((c) => c.name) ?? []

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-20 bg-muted/60 border border-border px-3 py-2 text-left font-semibold min-w-[160px]">
              Materia
            </th>
            {allInsumoNames.map((name) => (
              <th key={name} className="border border-border px-3 py-2 text-center font-semibold text-primary whitespace-nowrap">
                {name}
              </th>
            ))}
            {allInsumoNames.length > 0 && (
              <th className="border border-border px-3 py-2 text-center font-semibold text-primary bg-blue-50/50 whitespace-nowrap">
                Insumos
                <div className="text-[10px] font-normal text-muted-foreground">
                  {subjects.some((s) => s.examAvg !== undefined) ? `${100 - (subjects[0]?.examWeight ?? 30)}%` : 'promedio'}
                </div>
              </th>
            )}
            {subjects.some((s) => s.examAvg !== undefined) && (
              <th className="border border-border px-3 py-2 text-center font-semibold text-primary whitespace-nowrap">
                Examen
                <div className="text-[10px] font-normal text-muted-foreground">{subjects[0]?.examWeight ?? 30}%</div>
              </th>
            )}
            <th className="border border-border px-3 py-2 text-center font-semibold bg-muted whitespace-nowrap">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s, i) => (
            <tr key={s.assignmentId} className={cn('hover:bg-muted/20', i % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
              <td className="sticky left-0 z-10 bg-inherit border border-border px-3 py-2 font-medium whitespace-nowrap">
                <div>{s.subjectName}</div>
                <div className="text-xs text-muted-foreground">{s.teacherName}</div>
              </td>
              {allInsumoNames.map((name) => {
                const col = s.insumoColumns.find((c) => c.name === name)
                const v = col?.avg ?? null
                return (
                  <td key={name} className="border border-border px-3 py-2 text-center tabular-nums">
                    <span className={scoreColor(v, 10)}>{v != null ? v.toFixed(2) : '—'}</span>
                  </td>
                )
              })}
              {allInsumoNames.length > 0 && (
                <td className="border border-border px-3 py-2 text-center tabular-nums bg-blue-50/50 font-semibold">
                  <span className={scoreColor(s.regularAvg, 10)}>
                    {s.regularAvg != null ? s.regularAvg.toFixed(2) : '—'}
                  </span>
                </td>
              )}
              {subjects.some((sub) => sub.examAvg !== undefined) && (
                <td className="border border-border px-3 py-2 text-center tabular-nums">
                  <span className={scoreColor(s.examAvg ?? null, 10)}>
                    {s.examAvg != null ? s.examAvg.toFixed(2) : '—'}
                  </span>
                </td>
              )}
              <td className="border border-border px-3 py-2 text-center font-bold tabular-nums bg-muted/20">
                <span className={scoreColor(s.total, 10)}>
                  {s.total != null ? s.total.toFixed(2) : '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function GradeEntryPage() {
  const { hasAnyRole } = usePermissions()
  const isStudentOrGuardian = hasAnyRole('student', 'guardian')

  const teacherDefaults = useTeacherDefaults()

  // Student: load their own assignments + periods (backend resolves the active year)
  const { data: myData, isSuccess: myDataLoaded } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => academicApi.getMyAssignments(),
    enabled: isStudentOrGuardian,
  })
  const studentAssignments = myData?.assignments ?? []
  const studentPeriods = myData?.periods ?? []

  const assignments = isStudentOrGuardian ? studentAssignments : teacherDefaults.assignments
  const periods = isStudentOrGuardian ? studentPeriods : teacherDefaults.periods
  const defaultAssignmentId = isStudentOrGuardian
    ? (myDataLoaded && studentAssignments.length === 1 ? studentAssignments[0].id : '')
    : teacherDefaults.defaultAssignmentId
  const defaultPeriodId = isStudentOrGuardian
    ? (studentPeriods.find((p) => p.isActive)?.id ?? studentPeriods[0]?.id ?? '')
    : teacherDefaults.defaultPeriodId

  // Students only see summary tab
  const [activeTab, setActiveTab] = React.useState<Tab>(isStudentOrGuardian ? 'summary' : 'entry')
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState('')
  const [selectedPeriodId, setSelectedPeriodId] = React.useState('')
  const [selectedActivityId, setSelectedActivityId] = React.useState('')

  // Apply defaults once they're available
  React.useEffect(() => {
    if (defaultAssignmentId && !selectedAssignmentId) setSelectedAssignmentId(defaultAssignmentId)
  }, [defaultAssignmentId])

  React.useEffect(() => {
    if (defaultPeriodId && selectedAssignmentId && !selectedPeriodId) setSelectedPeriodId(defaultPeriodId)
  }, [defaultPeriodId, selectedAssignmentId])

  const { data: activitiesList = [] } = useQuery({
    queryKey: ['activities', selectedAssignmentId, selectedPeriodId],
    queryFn: () =>
      activitiesApi.getActivities({
        courseAssignmentId: selectedAssignmentId,
        periodId: selectedPeriodId,
      }),
    enabled: !!selectedAssignmentId && !!selectedPeriodId,
  })

  const selectedActivity = activitiesList.find((a) => a.id === selectedActivityId)

  const { data: grades = [], isLoading: gradesLoading } = useGradesByActivity(selectedActivityId)
  const bulkSave = useBulkSaveGrades()

  // Local grade state
  const [localGrades, setLocalGrades] = React.useState<Record<string, number | null>>({})
  const [modified, setModified] = React.useState<Set<string>>(new Set())

  // Reset local state when activity changes
  React.useEffect(() => {
    setLocalGrades({})
    setModified(new Set())
  }, [selectedActivityId])

  // Reset period/activity when assignment changes
  React.useEffect(() => {
    setSelectedPeriodId('')
    setSelectedActivityId('')
  }, [selectedAssignmentId])

  React.useEffect(() => {
    setSelectedActivityId('')
  }, [selectedPeriodId])

  function handleScoreChange(studentId: string, value: number | null) {
    setLocalGrades((prev) => ({ ...prev, [studentId]: value }))
    setModified((prev) => new Set(prev).add(studentId))
  }

  function handleSaveAll() {
    if (modified.size === 0) {
      toast.info('No hay cambios pendientes')
      return
    }
    const gradesToSave: GradeInput[] = Array.from(modified).map((studentId) => ({
      studentId,
      activityId: selectedActivityId,
      score: localGrades[studentId] ?? null,
    }))
    bulkSave.mutate(gradesToSave, {
      onSuccess: () => {
        setModified(new Set())
        setLocalGrades({})
      },
    })
  }

  const canShowGrades = !!selectedAssignmentId && !!selectedPeriodId && !!selectedActivityId

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
          <p className="text-muted-foreground text-sm mt-1">Ingresa y consulta las notas de los estudiantes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {!isStudentOrGuardian && (
          <button
            type="button"
            onClick={() => setActiveTab('entry')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'entry'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Ingresar Notas
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'summary'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {isStudentOrGuardian ? 'Mis Calificaciones' : 'Ver Resumen'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {!isStudentOrGuardian && (
          <div className="w-full sm:w-64">
            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar asignación" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.subject?.name ?? a.subjectName ?? a.subjectId} — {a.parallel?.level?.name ? `${a.parallel.level.name} ${a.parallel.name}` : (a.parallelName ?? a.parallelId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-full sm:w-44">
          <Select
            value={selectedPeriodId}
            onValueChange={setSelectedPeriodId}
            disabled={!isStudentOrGuardian && !selectedAssignmentId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeTab === 'entry' && !isStudentOrGuardian && (
          <div className="w-full sm:w-52">
            <Select
              value={selectedActivityId}
              onValueChange={setSelectedActivityId}
              disabled={!selectedPeriodId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Actividad" />
              </SelectTrigger>
              <SelectContent>
                {activitiesList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'summary' ? (
        isStudentOrGuardian ? (
          selectedPeriodId ? (
            <StudentGradesView periodId={selectedPeriodId} />
          ) : (
            <EmptyState icon={BarChart3} title="Selecciona un período" description="Elige el período académico para ver tus notas" />
          )
        ) : selectedAssignmentId && selectedPeriodId ? (
          <SummaryTab courseAssignmentId={selectedAssignmentId} periodId={selectedPeriodId} />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Selecciona una asignación y período"
            description="Para ver el resumen de notas, selecciona la asignación y el período"
          />
        )
      ) : !canShowGrades ? (
        <EmptyState
          icon={GraduationCap}
          title="Selecciona los filtros"
          description="Selecciona la asignación, período y actividad para ingresar notas"
        />
      ) : gradesLoading ? (
        <PageLoader />
      ) : grades.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Sin estudiantes"
          description="No hay estudiantes registrados para esta actividad"
        />
      ) : (
        <div className="space-y-4">
          {/* Activity info + Save button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div>
                <p className="break-words text-sm font-semibold">{selectedActivity?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Puntaje máximo: {selectedActivity?.maxScore} pts
                  {modified.size > 0 && (
                    <span className="ml-2 text-amber-600">
                      · {modified.size} {modified.size === 1 ? 'cambio pendiente' : 'cambios pendientes'}
                    </span>
                  )}
                </p>
              </div>
              {selectedActivity?.isPublished ? (
                <Badge variant="success">Publicado</Badge>
              ) : (
                <Badge variant="secondary">Borrador</Badge>
              )}
            </div>
            <Button
              onClick={handleSaveAll}
              loading={bulkSave.isPending}
              disabled={modified.size === 0}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Guardar todo
              {modified.size > 0 && (
                <Badge variant="warning" className="ml-1">
                  {modified.size}
                </Badge>
              )}
            </Button>
          </div>

          {/* Grade table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <GradeRow
                    key={grade.studentId}
                    grade={grade}
                    maxScore={selectedActivity?.maxScore ?? 10}
                    localScore={localGrades[grade.studentId]}
                    isModified={modified.has(grade.studentId)}
                    onChange={handleScoreChange}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  )
}
