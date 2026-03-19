import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Users, Settings, BookOpen, GraduationCap,
  ClipboardList, AlertTriangle, MessageSquare, Calendar,
  FileText, ChevronDown, BookMarked, X, UserPlus, ShieldCheck,
  ClipboardCheck, CalendarDays,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { useUIStore } from '@/store/ui.store'
import { useState } from 'react'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  permission?: string
  children?: Array<{ label: string; path: string }>
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Inicio',
    icon: Home,
    path: '/dashboard',
  },
  {
    label: 'Usuarios',
    icon: Users,
    path: '/users',
    permission: 'users:read',
  },
  {
    label: 'Roles y Permisos',
    icon: ShieldCheck,
    path: '/roles',
    permission: 'users:manage',
  },
  {
    label: 'Configuración',
    icon: Settings,
    path: '/academic',
    permission: 'academic_config:manage',
    children: [
      { label: 'Niveles',    path: '/academic/levels' },
      { label: 'Materias',   path: '/academic/subjects' },
      { label: 'Años lectivos', path: '/academic/years' },
      { label: 'Paralelos',  path: '/academic/parallels' },
      { label: 'Asignaciones', path: '/academic/assignments' },
      { label: 'Insumos por paralelo', path: '/academic/insumo-setup' },
    ],
  },
  {
    label: 'Matrículas',
    icon: UserPlus,
    path: '/enrollment',
    permission: 'academic_config:manage',
  },
  {
    label: 'Actividades',
    icon: BookOpen,
    path: '/activities',
    permission: 'activities:read',
  },
  {
    label: 'Calificaciones',
    icon: GraduationCap,
    path: '/grades',
    permission: 'grades:read',
  },
  {
    label: 'Asistencia',
    icon: ClipboardList,
    path: '/attendance',
    permission: 'attendance:write',
    children: [
      { label: 'Registro', path: '/attendance' },
      { label: 'Justificaciones', path: '/attendance/justifications' },
    ],
  },
  {
    label: 'Incidentes',
    icon: AlertTriangle,
    path: '/incidents',
    permission: 'incidents:write',
  },
  {
    label: 'Mensajes',
    icon: MessageSquare,
    path: '/messages',
  },
  {
    label: 'Tareas',
    icon: ClipboardCheck,
    path: '/tasks',
  },
  {
    label: 'Calendario',
    icon: CalendarDays,
    path: '/calendar',
  },
  {
    label: 'Horario',
    icon: Calendar,
    path: '/schedules',
  },
  {
    label: 'Reportes',
    icon: FileText,
    path: '/reports',
    permission: 'reports:read',
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const collapsed  = useUIStore((s) => s.sidebarCollapsed)
  const { hasPermission } = usePermissions()
  const location   = useLocation()
  const [expanded, setExpanded] = useState<string | null>(null)

  const visible = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 px-4 border-b border-sidebar-border shrink-0',
        collapsed ? 'justify-center' : 'gap-3',
      )}>
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shrink-0">
          <BookMarked className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sidebar-foreground text-sm">MaoEducación</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const isExpanded = expanded === item.path

          if (item.children && !collapsed) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'block rounded-md px-3 py-1.5 text-xs transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative z-10 flex flex-col w-72 bg-sidebar h-full shadow-xl">
            <button
              onClick={onMobileClose}
              className="absolute top-3.5 right-3 text-sidebar-foreground/60 hover:text-sidebar-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
