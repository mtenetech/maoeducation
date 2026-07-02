import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Building2, Eye, MessageSquare, Users } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DataTable } from '@/shared/components/ui/data-table'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { platformApi, type PlatformUser } from '../api/platform.api'

const USERS_PAGE_SIZE = 20

function fmtDay(d: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(new Date(d))
}

function fmtDateTime(d: string) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

function mergeSeries(
  a: { date: string; count: number }[],
  b: { date: string; count: number }[],
  keyA: string,
  keyB: string,
) {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const { date, count } of a) byDate.set(date, { date, [keyA]: count, [keyB]: 0 })
  for (const { date, count } of b) {
    const existing = byDate.get(date) ?? { date, [keyA]: 0, [keyB]: 0 }
    existing[keyB] = count
    byDate.set(date, existing)
  }
  return Array.from(byDate.values()).sort((x, y) => String(x.date).localeCompare(String(y.date)))
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-stats-overview'],
    queryFn: platformApi.getStatsOverview,
    refetchInterval: 60_000,
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: usersResult, isLoading: usersLoading } = useQuery({
    queryKey: ['platform-users', search, page],
    queryFn: () => platformApi.getPlatformUsers({ search: search || undefined, page, limit: USERS_PAGE_SIZE }),
  })

  const signupsSeries = useMemo(
    () => (stats ? mergeSeries(stats.signups.institutions, stats.signups.users, 'institutions', 'users') : []),
    [stats],
  )

  const columns: ColumnDef<PlatformUser>[] = [
    { accessorKey: 'fullName', header: 'Usuario' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'institutionName', header: 'Institución' },
    {
      id: 'accountType',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant={row.original.accountType === 'personal' ? 'outline' : 'secondary'}>
          {row.original.accountType === 'personal' ? 'Personal' : 'Institución'}
        </Badge>
      ),
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => <span className="text-sm text-slate-500">{row.original.roles.join(', ')}</span>,
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
      accessorKey: 'createdAt',
      header: 'Registrado',
      cell: ({ row }) => <span className="text-sm text-slate-500">{fmtDateTime(row.original.createdAt)}</span>,
    },
  ]

  if (statsLoading || !stats) return <PageLoader />

  const totalUserPages = usersResult ? Math.max(1, Math.ceil(usersResult.total / USERS_PAGE_SIZE)) : 1
  const maxPageViewCount = Math.max(1, ...stats.pageViews.topPages.map((p) => p.count))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estadísticas</h1>
        <p className="text-sm text-slate-500">Uso de la plataforma y tráfico de auleka.com</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Instituciones" value={stats.institutions.total} hint={`${stats.institutions.personal} personales · ${stats.institutions.schools} colegios`} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Usuarios" value={stats.users.total} />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Leads" value={stats.leads.total} />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Visitas (30d)" value={stats.pageViews.total30d} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Registros por día (30d)</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupsSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} width={30} />
                <Tooltip labelFormatter={(v) => fmtDay(String(v))} />
                <Line type="monotone" dataKey="institutions" name="Instituciones" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users" name="Usuarios" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Visitas a la landing por día (30d)</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.pageViews.series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} width={30} />
                <Tooltip labelFormatter={(v) => fmtDay(String(v))} />
                <Line type="monotone" dataKey="count" name="Visitas" stroke="#9333ea" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Páginas más visitadas (30d)</h2>
        {stats.pageViews.topPages.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Todavía no hay visitas registradas.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {stats.pageViews.topPages.map((p) => (
              <div key={p.path} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-slate-600">{p.path}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-blue"
                    style={{ width: `${(p.count / maxPageViewCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-slate-500">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Usuarios registrados</h2>
        <DataTable
          columns={columns}
          data={usersResult?.data ?? []}
          isLoading={usersLoading}
          searchPlaceholder="Buscar por nombre, email o institución..."
          onSearch={(value) => {
            setSearch(value)
            setPage(1)
          }}
          emptyMessage="Sin usuarios"
        />
        {usersResult && usersResult.total > USERS_PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {page} de {totalUserPages} · {usersResult.total} usuarios
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalUserPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
