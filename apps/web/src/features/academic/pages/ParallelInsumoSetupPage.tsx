import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Save, GripVertical } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { EmptyState } from '@/shared/components/feedback/empty-state'
import { useAcademicYears, useCourseAssignments, usePeriods } from '../hooks/useAcademic'
import { activitiesApi } from '@/features/activities/api/activities.api'

interface InsumoRow {
  name: string
  weight: string
  sortOrder: number
}

export function ParallelInsumoSetupPage() {
  const qc = useQueryClient()
  const { data: years = [] } = useAcademicYears()
  const activeYear = years.find((y) => y.isActive) ?? years[0]
  const yearId = activeYear?.id ?? ''

  const { data: allAssignments = [] } = useCourseAssignments(yearId ? { academicYearId: yearId } : undefined)
  const { data: periods = [] } = usePeriods(yearId)

  // Unique parallels from assignments
  const parallels = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string; levelName: string }>()
    for (const a of allAssignments) {
      if (a.parallelId && !seen.has(a.parallelId)) {
        seen.set(a.parallelId, {
          id: a.parallelId,
          name: a.parallel?.name ?? a.parallelId,
          levelName: a.parallel?.level?.name ?? '',
        })
      }
    }
    return Array.from(seen.values())
  }, [allAssignments])

  const [selectedParallelId, setSelectedParallelId] = React.useState('')
  const [selectedPeriodId, setSelectedPeriodId] = React.useState('')
  const [rows, setRows] = React.useState<InsumoRow[]>([])
  const [loaded, setLoaded] = React.useState(false)

  // Load existing template when parallel+period changes
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['parallel-template', selectedParallelId, yearId, selectedPeriodId],
    queryFn: () => activitiesApi.getParallelTemplate(selectedParallelId, yearId, selectedPeriodId),
    enabled: !!selectedParallelId && !!yearId && !!selectedPeriodId,
  })

  React.useEffect(() => {
    if (template !== undefined) {
      setRows(
        template.length > 0
          ? template.map((t) => ({ name: t.name, weight: t.weight != null ? String(t.weight) : '', sortOrder: t.sortOrder }))
          : [{ name: '', weight: '', sortOrder: 0 }],
      )
      setLoaded(true)
    }
  }, [template])

  React.useEffect(() => {
    setRows([{ name: '', weight: '', sortOrder: 0 }])
    setLoaded(false)
  }, [selectedParallelId, selectedPeriodId])

  const setupMutation = useMutation({
    mutationFn: (insumos: Array<{ name: string; weight?: number; sortOrder: number }>) =>
      activitiesApi.setupParallelInsumos({
        parallelId: selectedParallelId,
        academicYearId: yearId,
        periodId: selectedPeriodId,
        insumos,
      }),
    onSuccess: (res) => {
      toast.success(`Insumos aplicados a ${res.assignments} materias`)
      qc.invalidateQueries({ queryKey: ['parallel-template', selectedParallelId, yearId, selectedPeriodId] })
      qc.invalidateQueries({ queryKey: ['insumos'] })
    },
    onError: () => toast.error('Error al aplicar los insumos'),
  })

  function addRow() {
    setRows((prev) => [...prev, { name: '', weight: '', sortOrder: prev.length }])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof InsumoRow, value: string | number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function handleSave() {
    const insumos = rows
      .filter((r) => r.name.trim())
      .map((r, i) => ({
        name: r.name.trim(),
        weight: r.weight !== '' ? parseFloat(r.weight) : undefined,
        sortOrder: i,
      }))
    if (insumos.length === 0) {
      toast.error('Agrega al menos un insumo')
      return
    }
    setupMutation.mutate(insumos)
  }

  const subjectCount = allAssignments.filter(
    (a) => a.parallelId === selectedParallelId && a.academicYearId === yearId,
  ).length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Insumos por Paralelo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define los insumos (categorías de evaluación) que se aplicarán a todas las materias de un paralelo en un período.
        </p>
      </div>

      {/* Selectors */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-56">
          <label className="text-sm font-medium mb-1 block">Paralelo</label>
          <Select value={selectedParallelId} onValueChange={setSelectedParallelId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar paralelo" />
            </SelectTrigger>
            <SelectContent>
              {parallels.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.levelName} {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <label className="text-sm font-medium mb-1 block">Período</label>
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId} disabled={!selectedParallelId}>
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
      </div>

      {!selectedParallelId || !selectedPeriodId ? (
        <EmptyState
          icon={GripVertical}
          title="Selecciona un paralelo y período"
          description="Para configurar los insumos, elige el paralelo y el período académico"
        />
      ) : templateLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-4 max-w-xl">
          {subjectCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Se aplicará a <strong>{subjectCount} materias</strong> del paralelo seleccionado.
            </p>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_120px_32px] gap-2 text-sm font-medium text-muted-foreground px-1">
              <span>Nombre del insumo</span>
              <span>Peso (%)</span>
              <span />
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
                <Input
                  value={row.name}
                  onChange={(e) => updateRow(idx, 'name', e.target.value)}
                  placeholder={`Insumo ${idx + 1}`}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={row.weight}
                  onChange={(e) => updateRow(idx, 'weight', e.target.value)}
                  placeholder="Opcional"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Agregar insumo
            </Button>
            <Button onClick={handleSave} disabled={setupMutation.isPending} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {setupMutation.isPending ? 'Aplicando...' : 'Aplicar a todas las materias'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Los insumos existentes con el mismo nombre serán actualizados. Los insumos sin actividades que no estén en la lista serán eliminados.
          </p>
        </div>
      )}
    </div>
  )
}
