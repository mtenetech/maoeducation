import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import { Edit2, Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { type Subject } from '../api/academic.api'
import { useSubjects, useCreateSubject, useUpdateSubject } from '../hooks/useAcademic'

const subjectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido'),
})
type SubjectForm = z.infer<typeof subjectSchema>

export function SubjectsPage() {
  const { data: subjects = [], isLoading } = useSubjects()
  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Subject | null>(null)

  const form = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', code: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', code: '' })
    setOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditing(subject)
    form.reset({ name: subject.name, code: subject.code })
    setOpen(true)
  }

  function onSubmit(values: SubjectForm) {
    if (editing) {
      updateSubject.mutate(
        { id: editing.id, data: values },
        { onSuccess: () => setOpen(false) },
      )
    } else {
      createSubject.mutate(values, { onSuccess: () => setOpen(false) })
    }
  }

  const columns: ColumnDef<Subject, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'destructive'}>
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEdit(row.original)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materias</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona las materias del currículo institucional
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva Materia
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={subjects}
        emptyMessage="No hay materias registradas"
        emptyDescription="Crea una materia para comenzar"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Materia' : 'Nueva Materia'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register('name')} placeholder="Ej: Matemáticas" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                {...form.register('code')}
                placeholder="Ej: MAT"
                className="uppercase"
                onChange={(e) => form.setValue('code', e.target.value.toUpperCase())}
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createSubject.isPending || updateSubject.isPending}
              >
                {editing ? 'Guardar cambios' : 'Crear materia'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
