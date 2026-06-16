import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Phone, Building2, MapPin, Users, Calendar } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { platformApi, type Lead } from '../api/platform.api'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new:            { label: 'Nuevo',          variant: 'default' },
  contacted:      { label: 'Contactado',     variant: 'secondary' },
  demo_scheduled: { label: 'Demo agendada',  variant: 'outline' },
  closed_won:     { label: '✓ Cliente',      variant: 'default' },
  closed_lost:    { label: 'No calificó',    variant: 'destructive' },
}

const ROLE_LABEL: Record<string, string> = {
  rector: 'Rector/Director',
  dueño: 'Propietario',
  docente: 'Docente',
  administrativo: 'Administrativo',
  otro: 'Otro',
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export function LeadsPage() {
  const qc = useQueryClient()
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['platform-leads'],
    queryFn: platformApi.getLeads,
    refetchInterval: 60_000, // actualiza cada minuto
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      platformApi.updateLeadStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-leads'] }),
  })

  const byStatus = (s: string) => leads.filter((l) => l.status === s).length
  const total = leads.length

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads de la landing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solicitudes de demo recibidas desde auleka.com
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">{byStatus('new')} nuevos</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{byStatus('contacted')} contactados</span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700">{byStatus('closed_won')} clientes</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">{total} total</span>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aún no hay leads. Cuando alguien llene el formulario de la landing aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={(status) => updateStatus.mutate({ id: lead.id, status })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, onStatusChange }: { lead: Lead; onStatusChange: (s: string) => void }) {
  const cfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG['new']

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Info principal */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{lead.name}</span>
            {lead.role && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {ROLE_LABEL[lead.role] ?? lead.role}
              </span>
            )}
            <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-blue-600">
              <MessageSquare className="h-3.5 w-3.5" />
              {lead.email}
            </a>
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-green-600">
                <Phone className="h-3.5 w-3.5" />
                {lead.phone}
              </a>
            )}
            {lead.institutionName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {lead.institutionName}
              </span>
            )}
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {lead.city}
              </span>
            )}
            {lead.studentsCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {lead.studentsCount} estudiantes
              </span>
            )}
          </div>

          {lead.message && (
            <p className="text-sm text-slate-500 italic border-l-2 border-slate-200 pl-3">
              "{lead.message}"
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {fmtDate(lead.createdAt)}
            <span className="text-slate-300">·</span>
            <span>Fuente: {lead.source}</span>
          </div>
        </div>

        {/* Selector de estado */}
        <div className="sm:ml-4 sm:shrink-0 w-48">
          <Select value={lead.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
