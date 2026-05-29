import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/ui/data-table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/shared/components/ui/dialog'
import { getErrorMessage } from '@/shared/lib/utils'
import {
  listIncidentTypes, createIncidentType, updateIncidentType, toggleIncidentType,
  type IncidentType,
} from '../api/incidents.api'

const SEVERITY_LABELS: Record<string, string> = { leve: 'Leve', grave: 'Grave', muy_grave: 'Muy grave' }
const SEVERITY_VARIANT: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  leve: 'secondary', grave: 'warning', muy_grave: 'destructive',
}

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  severity: z.enum(['leve', 'grave', 'muy_grave']),
  description: z.string().optional(),
  requiresDece: z.boolean(),
  requiresCommitment: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export function IncidentTypesPage() {
  const qc = useQueryClient()
  const { data: types = [], isLoading } = useQuery({ queryKey: ['incident-types'], queryFn: listIncidentTypes })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IncidentType | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'leve', requiresDece: false, requiresCommitment: false },
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['incident-types'] })

  const mSave = useMutation({
    mutationFn: (data: FormValues) =>
      editing ? updateIncidentType(editing.id, data) : createIncidentType(data),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Tipo actualizado' : 'Tipo creado')
      setOpen(false)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const mToggle = useMutation({
    mutationFn: (id: string) => toggleIncidentType(id),
    onSuccess: () => { invalidate(); toast.success('Estado actualizado') },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', severity: 'leve', description: '', requiresDece: false, requiresCommitment: false })
    setOpen(true)
  }
  const openEdit = (t: IncidentType) => {
    setEditing(t)
    reset({
      name: t.name, severity: t.severity, description: t.description ?? '',
      requiresDece: t.requiresDece, requiresCommitment: t.requiresCommitment,
    })
    setOpen(true)
  }

  const columns: ColumnDef<IncidentType>[] = [
    { accessorKey: 'name', header: 'Tipo de falta' },
    {
      accessorKey: 'severity', header: 'Gravedad',
      cell: ({ row }) => (
        <Badge variant={SEVERITY_VARIANT[row.original.severity] ?? 'secondary'}>
          {SEVERITY_LABELS[row.original.severity] ?? row.original.severity}
        </Badge>
      ),
    },
    {
      id: 'flags', header: 'Requiere',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.requiresDece && <Badge variant="outline">DECE</Badge>}
          {row.original.requiresCommitment && <Badge variant="outline">Acta</Badge>}
        </div>
      ),
    },
    {
      accessorKey: 'isActive', header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={() => mToggle.mutate(row.original.id)}>
            {row.original.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Tipos de falta</h1>
        <p className="text-sm text-muted-foreground">Catálogo configurable del Código de Convivencia</p>
      </div>

      <DataTable
        columns={columns} data={types} isLoading={isLoading}
        emptyMessage="Sin tipos de falta"
        action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo tipo</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit((d) => mSave.mutate(d))}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar tipo de falta' : 'Nuevo tipo de falta'}</DialogTitle>
              <DialogDescription>Define la gravedad y si requiere DECE o acta de compromiso.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Gravedad</Label>
                <Select value={watch('severity')} onValueChange={(v) => setValue('severity', v as FormValues['severity'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                    <SelectItem value="muy_grave">Muy grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input id="description" {...register('description')} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('requiresDece')} className="h-4 w-4" />
                Requiere derivación al DECE
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('requiresCommitment')} className="h-4 w-4" />
                Requiere acta de compromiso
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={mSave.isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
