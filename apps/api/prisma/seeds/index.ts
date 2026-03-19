import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Institución base
  const institution = await prisma.institution.upsert({
    where: { code: 'ESCUELA_DEMO' },
    update: {},
    create: {
      name: 'Escuela Demo',
      code: 'ESCUELA_DEMO',
      settings: {},
    },
  })
  console.log(`✓ Institution: ${institution.name}`)

  // 2. Esquema de periodos: trimestral (por defecto)
  await prisma.academicPeriodScheme.upsert({
    where: { id: 'scheme-trimester' },
    update: {},
    create: {
      id: 'scheme-trimester',
      institutionId: institution.id,
      name: 'Trimestral',
      code: 'trimester',
      periodsCount: 3,
      isDefault: true,
    },
  })
  console.log('✓ Academic period scheme: Trimestral')

  // 3. Niveles educativos
  const levels = [
    { code: '1B', name: '1ro de Básica', sortOrder: 1 },
    { code: '2B', name: '2do de Básica', sortOrder: 2 },
    { code: '3B', name: '3ro de Básica', sortOrder: 3 },
    { code: '4B', name: '4to de Básica', sortOrder: 4 },
    { code: '5B', name: '5to de Básica', sortOrder: 5 },
    { code: '6B', name: '6to de Básica', sortOrder: 6 },
    { code: '7B', name: '7mo de Básica', sortOrder: 7 },
    { code: '8B', name: '8vo de Básica', sortOrder: 8 },
    { code: '9B', name: '9no de Básica', sortOrder: 9 },
  ]

  for (const l of levels) {
    await prisma.level.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: l.code } },
      update: {},
      create: { ...l, institutionId: institution.id },
    })
  }
  console.log(`✓ Levels: ${levels.length} niveles creados`)

  // 4. Tipos de actividad base
  const activityTypes = [
    { code: 'task',          name: 'Tarea',          sortOrder: 1 },
    { code: 'lesson',        name: 'Lección',         sortOrder: 2 },
    { code: 'quiz',          name: 'Prueba',          sortOrder: 3 },
    { code: 'exam',          name: 'Examen',          sortOrder: 4 },
    { code: 'project',       name: 'Proyecto',        sortOrder: 5 },
    { code: 'participation', name: 'Participación',   sortOrder: 6 },
    { code: 'reinforcement', name: 'Refuerzo',        sortOrder: 7 },
    { code: 'other',         name: 'Otro',            sortOrder: 8 },
  ]

  for (const t of activityTypes) {
    await prisma.activityType.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: t.code } },
      update: {},
      create: { ...t, institutionId: institution.id },
    })
  }
  console.log(`✓ Activity types: ${activityTypes.length} tipos creados`)

  // 5. Roles del sistema
  const roles = [
    { name: 'admin',     label: 'Administrador',       isSystem: true },
    { name: 'inspector', label: 'Inspector',            isSystem: true },
    { name: 'teacher',   label: 'Profesor',             isSystem: true },
    { name: 'student',   label: 'Alumno',               isSystem: true },
    { name: 'guardian',  label: 'Padre/Representante',  isSystem: true },
  ]

  const roleMap: Record<string, string> = {}
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { institutionId_name: { institutionId: institution.id, name: r.name } },
      update: {},
      create: { ...r, institutionId: institution.id },
    })
    roleMap[r.name] = role.id
  }
  console.log(`✓ Roles: ${roles.length} roles creados`)

  // 6. Permisos base
  const permissions = [
    // users
    { resource: 'users', action: 'read',   scope: 'all' },
    { resource: 'users', action: 'write',  scope: 'all' },
    { resource: 'users', action: 'manage', scope: 'all' },
    // academic_config
    { resource: 'academic_config', action: 'read',   scope: 'all' },
    { resource: 'academic_config', action: 'manage', scope: 'all' },
    // activities
    { resource: 'activities', action: 'read',  scope: 'all' },
    { resource: 'activities', action: 'read',  scope: 'own' },
    { resource: 'activities', action: 'write', scope: 'own' },
    // grades
    { resource: 'grades', action: 'read',  scope: 'all' },
    { resource: 'grades', action: 'read',  scope: 'own' },
    { resource: 'grades', action: 'write', scope: 'own' },
    // attendance
    { resource: 'attendance', action: 'read',  scope: 'all' },
    { resource: 'attendance', action: 'read',  scope: 'own' },
    { resource: 'attendance', action: 'write', scope: 'own' },
    // incidents
    { resource: 'incidents', action: 'read',  scope: 'all' },
    { resource: 'incidents', action: 'read',  scope: 'own' },
    { resource: 'incidents', action: 'write', scope: 'all' },
    // reports
    { resource: 'reports', action: 'read',   scope: 'all' },
    { resource: 'reports', action: 'read',   scope: 'own' },
    { resource: 'reports', action: 'manage', scope: 'all' },
    // insumos
    { resource: 'insumos', action: 'manage', scope: 'all' },
    { resource: 'insumos', action: 'read',   scope: 'own' },
    { resource: 'insumos', action: 'write',  scope: 'own' },
    // tasks
    { resource: 'tasks', action: 'read',  scope: 'all' },
    { resource: 'tasks', action: 'read',  scope: 'own' },
    { resource: 'tasks', action: 'write', scope: 'own' },
  ]

  const permMap: Record<string, string> = {}
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { resource_action_scope: { resource: p.resource, action: p.action, scope: p.scope } },
      update: {},
      create: p,
    })
    permMap[`${p.resource}:${p.action}:${p.scope}`] = perm.id
  }
  console.log(`✓ Permissions: ${permissions.length} permisos creados`)

  // 7. Asignación de permisos a roles
  const rolePermissions: Array<{ roleName: string; permKey: string }> = [
    // Admin tiene todo
    { roleName: 'admin', permKey: 'users:manage:all' },
    { roleName: 'admin', permKey: 'academic_config:manage:all' },
    { roleName: 'admin', permKey: 'activities:read:all' },
    { roleName: 'admin', permKey: 'grades:read:all' },
    { roleName: 'admin', permKey: 'attendance:read:all' },
    { roleName: 'admin', permKey: 'incidents:read:all' },
    { roleName: 'admin', permKey: 'incidents:write:all' },
    { roleName: 'admin', permKey: 'reports:manage:all' },
    { roleName: 'admin', permKey: 'insumos:manage:all' },
    { roleName: 'admin', permKey: 'tasks:read:all' },
    // Inspector
    { roleName: 'inspector', permKey: 'users:read:all' },
    { roleName: 'inspector', permKey: 'attendance:read:all' },
    { roleName: 'inspector', permKey: 'incidents:read:all' },
    { roleName: 'inspector', permKey: 'incidents:write:all' },
    { roleName: 'inspector', permKey: 'reports:read:all' },
    // Profesor
    { roleName: 'teacher', permKey: 'academic_config:read:all' },
    { roleName: 'teacher', permKey: 'activities:read:own' },
    { roleName: 'teacher', permKey: 'activities:write:own' },
    { roleName: 'teacher', permKey: 'grades:read:own' },
    { roleName: 'teacher', permKey: 'grades:write:own' },
    { roleName: 'teacher', permKey: 'attendance:read:own' },
    { roleName: 'teacher', permKey: 'attendance:write:own' },
    { roleName: 'teacher', permKey: 'incidents:read:own' },
    { roleName: 'teacher', permKey: 'insumos:read:own' },
    { roleName: 'teacher', permKey: 'insumos:write:own' },
    { roleName: 'teacher', permKey: 'tasks:read:own' },
    { roleName: 'teacher', permKey: 'tasks:write:own' },
    // Alumno/Padre
    { roleName: 'student',  permKey: 'activities:read:own' },
    { roleName: 'student',  permKey: 'grades:read:own' },
    { roleName: 'student',  permKey: 'attendance:read:own' },
    { roleName: 'student',  permKey: 'incidents:read:own' },
    { roleName: 'student',  permKey: 'tasks:read:own' },
    { roleName: 'guardian', permKey: 'activities:read:own' },
    { roleName: 'guardian', permKey: 'grades:read:own' },
    { roleName: 'guardian', permKey: 'attendance:read:own' },
    { roleName: 'guardian', permKey: 'incidents:read:own' },
    { roleName: 'guardian', permKey: 'tasks:read:own' },
  ]

  for (const rp of rolePermissions) {
    const roleId = roleMap[rp.roleName]
    const permId = permMap[rp.permKey]
    if (!roleId || !permId) continue
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permId } },
      update: {},
      create: { roleId, permissionId: permId },
    })
  }
  console.log('✓ Role permissions assigned')

  // 8. Usuario admin por defecto
  const adminPasswordHash = await bcrypt.hash('Admin1234!', 12)
  const adminUser = await prisma.user.upsert({
    where: { institutionId_email: { institutionId: institution.id, email: 'admin@escuela.edu' } },
    update: {},
    create: {
      institutionId: institution.id,
      email: 'admin@escuela.edu',
      passwordHash: adminPasswordHash,
      profile: {
        create: { firstName: 'Admin', lastName: 'Sistema' },
      },
    },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roleMap['admin'] } },
    update: {},
    create: { userId: adminUser.id, roleId: roleMap['admin'] },
  })

  console.log(`✓ Admin user: admin@escuela.edu / Admin1234!`)

  // 9. Usuarios de prueba para todos los roles
  const demoPassword = await bcrypt.hash('Demo1234!', 12)

  const demoUsers = [
    { email: 'inspector@escuela.edu', firstName: 'Carlos', lastName: 'Mendoza', role: 'inspector' },
    { email: 'profesor1@escuela.edu', firstName: 'María', lastName: 'González', role: 'teacher' },
    { email: 'profesor2@escuela.edu', firstName: 'Luis', lastName: 'Ramírez', role: 'teacher' },
    { email: 'alumno1@escuela.edu',   firstName: 'Sofía', lastName: 'Torres', role: 'student' },
    { email: 'alumno2@escuela.edu',   firstName: 'Diego', lastName: 'Flores', role: 'student' },
    { email: 'alumno3@escuela.edu',   firstName: 'Valentina', lastName: 'Castro', role: 'student' },
    { email: 'padre1@escuela.edu',    firstName: 'Jorge', lastName: 'Torres', role: 'guardian' },
  ]

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { institutionId_email: { institutionId: institution.id, email: u.email } },
      update: {},
      create: {
        institutionId: institution.id,
        email: u.email,
        passwordHash: demoPassword,
        profile: { create: { firstName: u.firstName, lastName: u.lastName } },
      },
    })
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleMap[u.role] } },
      update: {},
      create: { userId: user.id, roleId: roleMap[u.role] },
    })
  }
  console.log(`✓ Demo users: ${demoUsers.length} usuarios creados (contraseña: Demo1234!)`)
  console.log('\n✅ Seed completado exitosamente')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
