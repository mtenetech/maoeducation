import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  SYSTEM_ROLES,
  BASE_PERMISSIONS,
  ROLE_PERMISSIONS,
  DEFAULT_LEVELS,
  BASE_ACTIVITY_TYPES,
} from '../../src/modules/platform/application/services/institution-bootstrap'

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
  const levels = DEFAULT_LEVELS

  for (const l of levels) {
    await prisma.level.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: l.code } },
      update: {},
      create: { ...l, institutionId: institution.id },
    })
  }
  console.log(`✓ Levels: ${levels.length} niveles creados`)

  // 4. Tipos de actividad base
  const activityTypes = BASE_ACTIVITY_TYPES

  for (const t of activityTypes) {
    await prisma.activityType.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: t.code } },
      update: {},
      create: { ...t, institutionId: institution.id },
    })
  }
  console.log(`✓ Activity types: ${activityTypes.length} tipos creados`)

  // 5. Roles del sistema
  const roles = SYSTEM_ROLES

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
  const permissions = BASE_PERMISSIONS

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
  const rolePermissions = ROLE_PERMISSIONS

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

  // 10. Superadmin de plataforma (NO pertenece a ninguna institución)
  const platformPasswordHash = await bcrypt.hash('Super1234!', 12)
  await prisma.platformAdmin.upsert({
    where: { email: 'superadmin@mao.edu' },
    update: {},
    create: {
      email: 'superadmin@mao.edu',
      passwordHash: platformPasswordHash,
      name: 'Superadmin',
    },
  })
  console.log('✓ Platform superadmin: superadmin@mao.edu / Super1234!')

  console.log('\n✅ Seed completado exitosamente')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
