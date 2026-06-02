import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type ColumnDef } from '@tanstack/react-table'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { DataTable } from '@/shared/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useCreateInstitution, useInstitutions, useToggleInstitution } from '../hooks/usePlatform'
import type { Institution } from '../api/platform.api'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  code: z.string().min(2, 'Mínimo 2 caracteres'),
  adminFirstName: z.string().min(1, 'Requerido'),
  adminLastName: z.string().min(1, 'Requerido'),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function InstitutionsPage() {
  const navigate = useNavigate()
  const { data: institutions = [], isLoading } = useInstitutions()
  const createInstitution = useCreateInstitution()
  const toggleInstitution = useToggleInstitution()

  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const openCreate = () => {
    reset({ name: '', code: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' })
    setDialogOpen(true)
  }

  const onSubmit = (values: FormValues) => {
    createInstitution.mutate(
      {
        name: values.name,
        code: values.code,
        admin: {
          firstName: values.adminFirstName,
          lastName: values.adminLastName,
          email: values.adminEmail,
          password: values.adminPassword,
        },
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  const columns: ColumnDef<Institution>[] = [
    { accessorKey: 'name', header: 'Institución' },
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: 'userCount',
      header: 'Usuarios',
      cell: ({ row }) => <span className="tabular-nums">{row.original.userCount}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'destructive'}>
          {row.original.isActive ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/platform/institutions/${row.original.id}/admins`)}
          >
            <Users className="mr-1.5 h-4 w-4" />
            Admins
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={toggleInstitution.isPending && toggleInstitution.variables === row.original.id}
            onClick={() => toggleInstitution.mutate(row.original.id)}
          >
            {row.original.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instituciones</h1>
          <p className="text-sm text-slate-500">Crea y administra las instituciones de la plataforma</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={institutions}
        isLoading={isLoading}
        emptyMessage="Sin instituciones"
        emptyDescription="Crea la primera institución para empezar"
        action={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva institución
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Nueva institución</DialogTitle>
              <DialogDescription>
                Se crearán los roles, permisos y catálogos base, junto al administrador inicial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" placeholder="Unidad Educativa..." {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Código</Label>
                <Input id="code" placeholder="MI_ESCUELA" {...register('code')} />
                {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Administrador inicial</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="adminFirstName">Nombre</Label>
                    <Input id="adminFirstName" {...register('adminFirstName')} />
                    {errors.adminFirstName && (
                      <p className="text-xs text-red-500">{errors.adminFirstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adminLastName">Apellido</Label>
                    <Input id="adminLastName" {...register('adminLastName')} />
                    {errors.adminLastName && (
                      <p className="text-xs text-red-500">{errors.adminLastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input id="adminEmail" type="email" {...register('adminEmail')} />
                  {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail.message}</p>}
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="adminPassword">Contraseña</Label>
                  <Input id="adminPassword" type="password" {...register('adminPassword')} />
                  {errors.adminPassword && (
                    <p className="text-xs text-red-500">{errors.adminPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createInstitution.isPending}>
                Crear institución
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
