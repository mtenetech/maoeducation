export const ALL_MODULES = [
  'users',
  'roles',
  'academic',
  'enrollment',
  'anamnesis',
  'activities',
  'grades',
  'behavior',
  'pedagogic_recovery',
  'promotion',
  'attendance',
  'incidents',
  'parent_meetings',
  'student_folder',
  'messages',
  'tasks',
  'calendar',
  'schedules',
  'reports',
  'branding',
] as const

export type ModuleKey = (typeof ALL_MODULES)[number]

export const MODULE_LABELS: Record<ModuleKey, string> = {
  users: 'Usuarios',
  roles: 'Roles y Permisos',
  academic: 'Configuración Académica',
  enrollment: 'Matrículas',
  anamnesis: 'Ficha de Anamnesis',
  activities: 'Actividades',
  grades: 'Calificaciones',
  behavior: 'Comportamiento',
  pedagogic_recovery: 'Recuperación Pedagógica',
  promotion: 'Promoción',
  attendance: 'Asistencia',
  incidents: 'Incidentes',
  parent_meetings: 'Atención a Padres',
  student_folder: 'Carpeta del Estudiante',
  messages: 'Mensajes',
  tasks: 'Tareas',
  calendar: 'Calendario',
  schedules: 'Horario',
  reports: 'Reportes',
  branding: 'Personalización',
}

/** Módulos habilitados por defecto para cuentas personales de profesores. */
export const PERSONAL_DEFAULT_MODULES: ModuleKey[] = [
  'academic',
  'enrollment',
  'activities',
  'grades',
  'attendance',
  'reports',
  'branding',
]
