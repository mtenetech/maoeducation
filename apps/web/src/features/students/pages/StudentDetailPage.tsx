import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, UserPlus, KeyRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/shared/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { DynamicForm } from '@/shared/components/form/DynamicForm'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import {
  getStudent, updateStudent, getGuardians, addGuardian, updateGuardianLink, removeGuardian,
  resetUserPassword, getStudentAnamnesis, saveStudentAnamnesis,
  type StudentProfile, type CreateGuardianPayload,
} from '../api/students.api'

type Tab = 'datos' | 'representantes' | 'anamnesis'

const RELATIONSHIPS = [
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'tutor_legal', label: 'Tutor legal' },
  { value: 'otro', label: 'Otro' },
]

const emptyProfile: Partial<StudentProfile> = {}

export function StudentDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('datos')

  const studentQ = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id), retry: false })

  if (studentQ.isLoading) return <PageLoader />

  if (studentQ.isError || !studentQ.data) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">No se pudo cargar la ficha del estudiante</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {studentQ.isError
              ? getErrorMessage(studentQ.error)
              : 'No tienes acceso a este estudiante o no existe.'}
          </p>
        </div>
      </div>
    )
  }
  const student = studentQ.data

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
        </Button>
        <h1 className="text-2xl font-bold">{student.fullName}</h1>
        <p className="text-sm text-muted-foreground">{student.email}</p>
      </div>

      <div className="flex gap-1 border-b">
        {(['datos', 'representantes', 'anamnesis'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'datos' ? 'Datos' : t === 'representantes' ? 'Representantes' : 'Anamnesis'}
          </button>
        ))}
      </div>

      {tab === 'datos' && <DatosTab id={id} profile={student.profile} onSaved={() => qc.invalidateQueries({ queryKey: ['student', id] })} />}
      {tab === 'representantes' && <RepresentantesTab id={id} />}
      {tab === 'anamnesis' && <AnamnesisTab id={id} />}
    </div>
  )
}

// ─────────────────────────── Datos ───────────────────────────
function DatosTab({ id, profile, onSaved }: { id: string; profile: StudentProfile | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<StudentProfile>>(profile ?? emptyProfile)
  const set = (k: keyof StudentProfile, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const mSave = useMutation({
    mutationFn: () => updateStudent(id, form),
    onSuccess: () => { toast.success('Datos guardados'); onSaved() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const field = (k: keyof StudentProfile, label: string, type = 'text') => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} />
    </div>
  )

  return (
    <Card>
      <CardHeader><CardTitle>Datos del estudiante</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('firstName', 'Nombres')}
          {field('lastName', 'Apellidos')}
          {field('dni', 'Cédula')}
          {field('birthDate', 'Fecha de nacimiento', 'date')}
          {field('gender', 'Género')}
          {field('nationality', 'Nacionalidad')}
          {field('placeOfBirth', 'Lugar de nacimiento')}
          {field('bloodType', 'Tipo de sangre')}
          {field('phone', 'Teléfono')}
          {field('phoneAlt', 'Teléfono alterno')}
          {field('address', 'Dirección')}
          {field('emergencyContactName', 'Contacto de emergencia')}
          {field('emergencyContactPhone', 'Teléfono de emergencia')}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => mSave.mutate()} loading={mSave.isPending}>Guardar datos</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────── Representantes ───────────────────────
function RepresentantesTab({ id }: { id: string }) {
  const qc = useQueryClient()
  const { data: guardians = [], isLoading } = useQuery({ queryKey: ['guardians', id], queryFn: () => getGuardians(id) })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateGuardianPayload>({ relationship: 'padre' })
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null)
  const [pwValue, setPwValue] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['guardians', id] })

  const mResetPw = useMutation({
    mutationFn: () => resetUserPassword(pwTarget!.id, pwValue),
    onSuccess: () => { toast.success('Contraseña actualizada'); setPwTarget(null); setPwValue('') },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const mAdd = useMutation({
    // La contraseña por defecto es la cédula.
    mutationFn: () => addGuardian(id, { ...form, password: form.password?.trim() ? form.password : form.dni }),
    onSuccess: () => { toast.success('Representante agregado'); setOpen(false); setForm({ relationship: 'padre' }); refresh() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  function handleAddGuardian() {
    if (!form.firstName?.trim() || !form.lastName?.trim()) return toast.error('Nombres y apellidos son obligatorios')
    if (!form.email?.trim()) return toast.error('El email es obligatorio')
    if (!/^\d{10}$/.test((form.dni ?? '').trim())) return toast.error('La cédula debe tener 10 dígitos')
    mAdd.mutate()
  }
  const mToggleFlag = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Record<string, boolean> }) => updateGuardianLink(id, gid, data),
    onSuccess: refresh,
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const mRemove = useMutation({
    mutationFn: (gid: string) => removeGuardian(id, gid),
    onSuccess: () => { toast.success('Representante desvinculado'); refresh() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const set = (k: keyof CreateGuardianPayload, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nuevo representante</Button>
      </div>

      {guardians.length === 0 && <p className="text-sm text-muted-foreground">Sin representantes registrados.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {guardians.map((g) => (
          <Card key={g.guardianId}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {g.fullName}
                <span className="flex gap-1">
                  <Button
                    variant="ghost" size="sm" title="Cambiar contraseña"
                    onClick={() => { setPwTarget({ id: g.guardianId, name: g.fullName }); setPwValue('') }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Desvincular" onClick={() => mRemove.mutate(g.guardianId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{g.email}</p>
              <p>Parentesco: <span className="capitalize">{g.relationship.replace('_', ' ')}</span></p>
              {g.profile?.phone && <p>Tel: {g.profile.phone}</p>}
              {g.profile?.occupation && <p>Ocupación: {g.profile.occupation}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {([
                  ['isLegalRep', 'Rep. legal'],
                  ['livesWithStudent', 'Vive con'],
                  ['isEmergencyContact', 'Emergencia'],
                ] as const).map(([flag, label]) => (
                  <button
                    key={flag}
                    onClick={() => mToggleFlag.mutate({ gid: g.guardianId, data: { [flag]: !g[flag] } })}
                  >
                    <Badge variant={g[flag] ? 'success' : 'outline'}>{label}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo representante</DialogTitle>
            <DialogDescription>Se crea una cuenta con rol de representante (puede iniciar sesión).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nombres</Label><Input value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Apellidos</Label><Input value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input type="password" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} placeholder="Por defecto: la cédula" />
              <p className="text-xs text-muted-foreground">Si la dejas vacía, la contraseña inicial será la cédula.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Cédula *</Label><Input value={form.dni ?? ''} onChange={(e) => set('dni', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10 dígitos" /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
            </div>
            <div className="space-y-1.5"><Label>Ocupación</Label><Input value={form.occupation ?? ''} onChange={(e) => set('occupation', e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Parentesco</Label>
              <Select value={form.relationship} onValueChange={(v) => set('relationship', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={!!form.isLegalRep} onChange={(e) => set('isLegalRep', e.target.checked)} /> Rep. legal</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={!!form.livesWithStudent} onChange={(e) => set('livesWithStudent', e.target.checked)} /> Vive con</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={!!form.isEmergencyContact} onChange={(e) => set('isEmergencyContact', e.target.checked)} /> Emergencia</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGuardian} loading={mAdd.isPending}>
              <UserPlus className="mr-2 h-4 w-4" /> Crear y vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwTarget} onOpenChange={(o) => { if (!o) setPwTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Nueva contraseña para {pwTarget?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="newpw">Nueva contraseña</Label>
            <Input
              id="newpw" type="text" value={pwValue} placeholder="Mínimo 6 caracteres"
              onChange={(e) => setPwValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>Cancelar</Button>
            <Button onClick={() => mResetPw.mutate()} loading={mResetPw.isPending} disabled={pwValue.length < 6}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────── Anamnesis ───────────────────────────
function AnamnesisTab({ id }: { id: string }) {
  const anamnesisQ = useQuery({ queryKey: ['anamnesis', id], queryFn: () => getStudentAnamnesis(id) })
  const [answers, setAnswers] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (anamnesisQ.data?.record) setAnswers(anamnesisQ.data.record.answers ?? {})
  }, [anamnesisQ.data])

  const mSave = useMutation({
    mutationFn: () => saveStudentAnamnesis(id, { templateId: anamnesisQ.data?.template.id, answers }),
    onSuccess: () => toast.success('Anamnesis guardada'),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (anamnesisQ.isLoading) return <PageLoader />
  if (anamnesisQ.isError || !anamnesisQ.data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">No se pudo cargar la anamnesis</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {anamnesisQ.isError ? getErrorMessage(anamnesisQ.error) : 'No hay una plantilla de anamnesis configurada.'}
        </p>
      </div>
    )
  }
  const { template } = anamnesisQ.data

  return (
    <Card>
      <CardHeader><CardTitle>{template.name}</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <DynamicForm
          schema={template.schema}
          values={answers}
          onChange={(k, v) => setAnswers((a) => ({ ...a, [k]: v }))}
        />
        <div className="flex justify-end">
          <Button onClick={() => mSave.mutate()} loading={mSave.isPending}>Guardar anamnesis</Button>
        </div>
      </CardContent>
    </Card>
  )
}
