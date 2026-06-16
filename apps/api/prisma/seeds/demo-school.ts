/**
 * Seed de escuela demo para presentaciones comerciales.
 * Credenciales: contraseña 12345678 para todos.
 * Código de institución: DEMO_UE
 *
 * Estructura:
 *   1ro–7mo EGB   → un solo docente da todas las materias, asistencia DIARIA
 *   8vo–9no EGB   → docentes especializados por materia, asistencia POR MATERIA
 *   1ro Bachiller → docentes especializados, asistencia POR MATERIA
 *   T1 y T2 CERRADOS con notas completas · T3 abierto
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  SYSTEM_ROLES,
  BASE_PERMISSIONS,
  ROLE_PERMISSIONS,
  BASE_ACTIVITY_TYPES,
  DEFAULT_INCIDENT_TYPES,
  DEFAULT_ANAMNESIS_SCHEMA,
  DEFAULT_QUALITATIVE_SUBJECTS,
  DEFAULT_GRADING_CONFIG,
} from '../../src/modules/platform/application/services/institution-bootstrap'

const prisma = new PrismaClient()

const INST_CODE = 'DEMO_UE'
const INST_NAME = 'Unidad Educativa Fiscal Nacional Demo'
const PWD = '12345678'

// ─── Niveles ─────────────────────────────────────────────────────────────────
// Primaria (1ro–7mo): un docente todo, asistencia diaria
const PRIMARY_LEVELS = [
  { code: 'PRIM_1', name: '1ro Educación Básica',  sortOrder: 1,  attendanceMode: 'daily' },
  { code: 'PRIM_2', name: '2do Educación Básica',  sortOrder: 2,  attendanceMode: 'daily' },
  { code: 'PRIM_3', name: '3ro Educación Básica',  sortOrder: 3,  attendanceMode: 'daily' },
  { code: 'PRIM_4', name: '4to Educación Básica',  sortOrder: 4,  attendanceMode: 'daily' },
  { code: 'PRIM_5', name: '5to Educación Básica',  sortOrder: 5,  attendanceMode: 'daily' },
  { code: 'PRIM_6', name: '6to Educación Básica',  sortOrder: 6,  attendanceMode: 'daily' },
  { code: 'PRIM_7', name: '7mo Educación Básica',  sortOrder: 7,  attendanceMode: 'daily' },
]
// Básica superior + bachillerato: docentes especializados, asistencia por materia
const SECONDARY_LEVELS = [
  { code: 'BASIC_8', name: '8vo Educación Básica',  sortOrder: 8,  attendanceMode: 'per_subject' },
  { code: 'BASIC_9', name: '9no Educación Básica',  sortOrder: 9,  attendanceMode: 'per_subject' },
  { code: 'BACH_1',  name: '1ro Bachillerato',       sortOrder: 10, attendanceMode: 'per_subject' },
]
const ALL_LEVELS = [...PRIMARY_LEVELS, ...SECONDARY_LEVELS]

// Materias primaria (sin Inglés ni EF independiente en primaria)
const PRIMARY_SUBJECTS = [
  { name: 'Matemáticas',        code: 'MAT'  },
  { name: 'Lengua y Literatura', code: 'LENG' },
  { name: 'Ciencias Naturales',  code: 'CN'   },
  { name: 'Estudios Sociales',   code: 'SS'   },
]
// Materias básica superior + bachillerato
const SECONDARY_SUBJECTS = [
  { name: 'Matemáticas',        code: 'MAT'  },
  { name: 'Lengua y Literatura', code: 'LENG' },
  { name: 'Ciencias Naturales',  code: 'CN'   },
  { name: 'Estudios Sociales',   code: 'SS'   },
  { name: 'Inglés',             code: 'ING'  },
  { name: 'Educación Física',   code: 'EF'   },
]
const ALL_SUBJECTS = [...new Map([...PRIMARY_SUBJECTS, ...SECONDARY_SUBJECTS].map(s => [s.code, s])).values()]

// ─── Staff ────────────────────────────────────────────────────────────────────
// slug = usuario de login (sin @)
const STAFF = [
  { slug: 'adminsistema',   firstName: 'Admin',      lastName: 'Sistema',      role: 'admin'     },
  { slug: 'veronicamoreira',firstName: 'Verónica',   lastName: 'Moreira',      role: 'rector'    },
  { slug: 'gabrielaproano', firstName: 'Gabriela',   lastName: 'Proaño',       role: 'dece'      },
  { slug: 'robertochica',   firstName: 'Roberto',    lastName: 'Chica',        role: 'inspector' },
  // Docentes primaria (por grupo de grados)
  { slug: 'rosavera',       firstName: 'Rosa',       lastName: 'Vera',         role: 'teacher'   }, // 1ro-3ro
  { slug: 'luisnaranjo',    firstName: 'Luis',       lastName: 'Naranjo',      role: 'teacher'   }, // 4to-5to
  { slug: 'marthacabrera',  firstName: 'Martha',     lastName: 'Cabrera',      role: 'teacher'   }, // 6to-7mo
  // Docentes especialistas básica superior + bachillerato
  { slug: 'carlosespinoza', firstName: 'Carlos',     lastName: 'Espinoza',     role: 'teacher'   }, // Matemáticas
  { slug: 'mariavera',      firstName: 'María',      lastName: 'Vera',         role: 'teacher'   }, // Lengua
  { slug: 'ananaranjo',     firstName: 'Ana',        lastName: 'Naranjo',      role: 'teacher'   }, // CN
  { slug: 'pedromolina',    firstName: 'Pedro',      lastName: 'Molina',       role: 'teacher'   }, // SS
  { slug: 'dianaflores',    firstName: 'Diana',      lastName: 'Flores',       role: 'teacher'   }, // Inglés
  { slug: 'luiscamacho',    firstName: 'Luis',       lastName: 'Camacho',      role: 'teacher'   }, // EF
]

// Docente por materia (básica superior/bachillerato)
const SEC_SUBJECT_TEACHER: Record<string, string> = {
  'Matemáticas':         'carlosespinoza',
  'Lengua y Literatura': 'mariavera',
  'Ciencias Naturales':  'ananaranjo',
  'Estudios Sociales':   'pedromolina',
  'Inglés':              'dianaflores',
  'Educación Física':    'luiscamacho',
}

// Docente tutor para cada nivel primario (un docente da todo)
const PRIM_TUTOR: Record<string, string> = {
  PRIM_1: 'rosavera', PRIM_2: 'rosavera', PRIM_3: 'rosavera',
  PRIM_4: 'luisnaranjo', PRIM_5: 'luisnaranjo',
  PRIM_6: 'marthacabrera', PRIM_7: 'marthacabrera',
}

// ─── Nombres ecuatorianos ─────────────────────────────────────────────────────
const FEM = ['Sofía','Valentina','Camila','Gabriela','María','Daniela','Fernanda','Andrea','Paula','Karla','Isabel','Natalia','Vanessa','Cristina','Valeria','Michelle','Priscila','Samantha','Jennifer','Melissa','Carolina','Alejandra','Estefanía','Xiomara','Lisette']
const MASC= ['Diego','Sebastián','Andrés','Felipe','Juan','Carlos','David','Miguel','Roberto','Javier','Hernán','Edwin','Jonathan','Alexis','Bryan','Kevin','Steven','Christopher','Josué','Emanuel','Mateo','Nicolás','Emilio','Ricardo','Gonzalo']
const AP1 = ['Torres','García','López','Martínez','González','Rodríguez','Pérez','Sánchez','Ramírez','Cruz','Morales','Gómez','Díaz','Reyes','Mendoza','Ortiz','Delgado','Castro','Vargas','Cabrera','Espinoza','Vera','Molina','Naranjo','Flores']
const AP2 = ['Quiñónez','Moreira','Jara','Cedeño','Lara','Navarrete','Proaño','Pacheco','Villalba','Gavilanes','Arias','Benítez','Bravo','Coello','Córdova','Estrella','Herrera','Intriago','Jumbo','Loor','Mero','Nieto','Ochoa','Palacios','Quiroga']

// Nombre slug para login (sin tildes, sin espacios)
function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '')
}

function makeStudent(levelIdx: number, parallelIdx: number, studentIdx: number) {
  const isFem = studentIdx % 2 === 0
  const firstName = isFem ? FEM[studentIdx % FEM.length] : MASC[studentIdx % MASC.length]
  const ap1 = AP1[(levelIdx * 7 + parallelIdx * 3 + studentIdx) % AP1.length]
  const ap2 = AP2[(levelIdx * 5 + parallelIdx * 2 + studentIdx * 3) % AP2.length]
  const lastName = `${ap1} ${ap2}`
  const slug = slugify(`${firstName}${ap1}`)
  const dni = `${levelIdx + 1}${String(parallelIdx * 100 + studentIdx + 1).padStart(9, '0')}`
  return { firstName, lastName, slug, dni }
}

// Nota determinista: estudiantes 0-16 buenos (7-9.5), 17-19 bajos (5-6.8)
function grade(studentIdx: number, subjectIdx: number, period: 1 | 2): number {
  const offset = period === 2 ? 0.2 : 0
  if (studentIdx < 17) {
    return Math.round((7.0 + ((studentIdx * 3 + subjectIdx * 7) % 25) * 0.1 + offset) * 10) / 10
  }
  return Math.round((5.0 + ((studentIdx * 5 + subjectIdx * 3) % 18) * 0.1 + offset) * 10) / 10
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎓 Creando escuela demo para presentaciones...\n')
  const hash = await bcrypt.hash(PWD, 12)

  // 1. Institución
  const inst = await prisma.institution.upsert({
    where: { code: INST_CODE },
    update: { name: INST_NAME },
    create: {
      name: INST_NAME, code: INST_CODE,
      settings: {
        gradingConfig: {
          ...DEFAULT_GRADING_CONFIG,
          promotion: { minToPass: 7.0, supletorioMin: 5.0, supletorioMax: 6.99, passWithExam: 7.0, maxFailedSubjects: 1 },
          defaultExamWeight: 30,
          pedagogicRecovery: { mode: 'replace_if_higher' },
        },
      },
    },
  })
  console.log(`✓ ${inst.name} [${INST_CODE}]`)

  // 2. Esquema trimestral
  let scheme = await prisma.academicPeriodScheme.findFirst({ where: { institutionId: inst.id } })
  if (!scheme) {
    scheme = await prisma.academicPeriodScheme.create({
      data: { institutionId: inst.id, name: 'Trimestral', code: 'trimester', periodsCount: 3, isDefault: true },
    })
  }

  // 3. Niveles
  const levelMap: Record<string, string> = {}
  for (const l of ALL_LEVELS) {
    const level = await prisma.level.upsert({
      where: { institutionId_code: { institutionId: inst.id, code: l.code } },
      update: { attendanceMode: l.attendanceMode },
      create: { institutionId: inst.id, ...l, isActive: true },
    })
    levelMap[l.code] = level.id
  }
  console.log(`✓ Niveles: ${ALL_LEVELS.length} (7 primaria + 3 básica superior/bachillerato)`)

  // 4. Catálogos
  for (const t of BASE_ACTIVITY_TYPES) {
    await prisma.activityType.upsert({ where: { institutionId_code: { institutionId: inst.id, code: t.code } }, update: {}, create: { ...t, institutionId: inst.id } })
  }
  for (const t of DEFAULT_INCIDENT_TYPES) {
    await prisma.incidentType.upsert({ where: { institutionId_code: { institutionId: inst.id, code: t.code } }, update: {}, create: { ...t, institutionId: inst.id } })
  }
  const existingTemplate = await prisma.anamnesisTemplate.findFirst({ where: { institutionId: inst.id, isDefault: true } })
  if (!existingTemplate) {
    await prisma.anamnesisTemplate.create({ data: { institutionId: inst.id, name: 'Ficha de anamnesis', isDefault: true, schema: DEFAULT_ANAMNESIS_SCHEMA as object } })
  }
  for (const name of DEFAULT_QUALITATIVE_SUBJECTS) {
    const ex = await prisma.subject.findFirst({ where: { institutionId: inst.id, name } })
    if (!ex) await prisma.subject.create({ data: { institutionId: inst.id, name, isQualitative: true } })
  }
  console.log('✓ Catálogos (actividades, incidentes, anamnesis)')

  // 5. Roles y permisos
  const roleMap: Record<string, string> = {}
  for (const r of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({ where: { institutionId_name: { institutionId: inst.id, name: r.name } }, update: {}, create: { ...r, institutionId: inst.id } })
    roleMap[r.name] = role.id
  }
  const permMap: Record<string, string> = {}
  for (const p of BASE_PERMISSIONS) {
    const perm = await prisma.permission.upsert({ where: { resource_action_scope: { resource: p.resource, action: p.action, scope: p.scope } }, update: {}, create: p })
    permMap[`${p.resource}:${p.action}:${p.scope}`] = perm.id
  }
  for (const rp of ROLE_PERMISSIONS) {
    const roleId = roleMap[rp.roleName]; const permId = permMap[rp.permKey]
    if (!roleId || !permId) continue
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId, permissionId: permId } }, update: {}, create: { roleId, permissionId: permId } })
  }
  console.log('✓ Roles y permisos')

  // 6. Staff
  const userMap: Record<string, string> = {} // slug → userId
  for (const u of STAFF) {
    const email = `${u.slug}@demo.edu`
    const user = await prisma.user.upsert({
      where: { institutionId_email: { institutionId: inst.id, email } },
      update: {},
      create: { institutionId: inst.id, email, passwordHash: hash, profile: { create: { firstName: u.firstName, lastName: u.lastName } } },
    })
    userMap[u.slug] = user.id
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: roleMap[u.role] } }, update: {}, create: { userId: user.id, roleId: roleMap[u.role] } })
  }
  console.log(`✓ Staff: ${STAFF.length} usuarios`)

  // 7. Año lectivo 2024-2025
  let year = await prisma.academicYear.findFirst({ where: { institutionId: inst.id, name: '2024-2025' } })
  if (!year) {
    year = await prisma.academicYear.create({
      data: { institutionId: inst.id, name: '2024-2025', isActive: true, startDate: new Date('2024-09-02'), endDate: new Date('2025-08-29') },
    })
  }

  // 8. Períodos — T1 y T2 cerrados, T3 abierto
  const PERIODS = [
    { num: 1, name: 'Trimestre 1', start: '2024-09-02', end: '2024-12-20', closed: true,  active: false },
    { num: 2, name: 'Trimestre 2', start: '2025-01-06', end: '2025-04-30', closed: true,  active: false },
    { num: 3, name: 'Trimestre 3', start: '2025-05-05', end: '2025-08-29', closed: false, active: true  },
  ]
  const periodIds: string[] = []
  for (const pd of PERIODS) {
    const period = await prisma.academicPeriod.upsert({
      where: { academicYearId_periodNumber: { academicYearId: year.id, periodNumber: pd.num } },
      update: { isClosed: pd.closed, isActive: pd.active },
      create: { academicYearId: year.id, schemeId: scheme.id, periodNumber: pd.num, name: pd.name, startDate: new Date(pd.start), endDate: new Date(pd.end), isActive: pd.active, isClosed: pd.closed },
    })
    periodIds.push(period.id)
  }
  const [p1Id, p2Id] = periodIds
  console.log('✓ Año 2024-2025 (T1 ✓ T2 ✓ cerrados · T3 abierto)')

  // 9. Materias
  const subjectMap: Record<string, string> = {} // code → id
  for (const s of ALL_SUBJECTS) {
    let sub = await prisma.subject.findFirst({ where: { institutionId: inst.id, code: s.code } })
    if (!sub) sub = await prisma.subject.create({ data: { institutionId: inst.id, name: s.name, code: s.code, isQualitative: false } })
    subjectMap[s.code] = sub.id
  }
  console.log(`✓ Materias: ${ALL_SUBJECTS.length}`)

  // ─────────────────────────────────────────────────────────────────────────
  // 10–15. Por cada nivel: paralelo, asignaciones, estudiantes, notas
  // ─────────────────────────────────────────────────────────────────────────
  const actType = await prisma.activityType.findFirst({ where: { institutionId: inst.id, code: 'task' } })
  const examType = await prisma.activityType.findFirst({ where: { institutionId: inst.id, code: 'exam' } })
  if (!actType || !examType) throw new Error('Activity types no encontrados')

  const adminId = userMap['adminsistema']
  let totalStudents = 0

  for (let li = 0; li < ALL_LEVELS.length; li++) {
    const lv = ALL_LEVELS[li]
    const levelId = levelMap[lv.code]
    const isPrimary = lv.attendanceMode === 'daily'
    const subjects = isPrimary ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS
    const STUDENTS_PER = isPrimary ? 20 : 25
    const tutorSlug = isPrimary ? PRIM_TUTOR[lv.code] : null

    // — Paralelo único "A" —
    let parallel = await prisma.parallel.findFirst({ where: { levelId, academicYearId: year.id, name: 'A' } })
    if (!parallel) {
      parallel = await prisma.parallel.create({
        data: {
          institutionId: inst.id, levelId, academicYearId: year.id, name: 'A',
          tutorId: tutorSlug ? userMap[tutorSlug] : null,
        },
      })
    }

    // — Asignaciones —
    const assignmentIds: string[] = []
    for (const sub of subjects) {
      const teacherSlug = isPrimary ? tutorSlug! : SEC_SUBJECT_TEACHER[sub.name]
      const teacherId = userMap[teacherSlug]
      const subjectId = subjectMap[sub.code]

      let asgn = await prisma.courseAssignment.findFirst({ where: { subjectId, parallelId: parallel.id, academicYearId: year.id } })
      if (!asgn) {
        asgn = await prisma.courseAssignment.create({
          data: { institutionId: inst.id, teacherId, subjectId, parallelId: parallel.id, academicYearId: year.id, examWeight: 30 },
        })
      }
      assignmentIds.push(asgn.id)

      // — Insumos y actividades para T1 y T2 —
      for (const [pid, period] of [[p1Id, 1], [p2Id, 2]] as [string, 1 | 2][]) {
        // Insumo de tareas
        let ins = await prisma.insumo.findFirst({ where: { courseAssignmentId: asgn.id, academicPeriodId: pid, name: 'Tareas' } })
        if (!ins) {
          ins = await prisma.insumo.create({
            data: { institutionId: inst.id, courseAssignmentId: asgn.id, academicPeriodId: pid, name: 'Tareas', createdBy: teacherId },
          })
        }

        // Actividad tarea
        let act1 = await prisma.activity.findFirst({ where: { courseAssignmentId: asgn.id, academicPeriodId: pid, insumoId: ins.id, name: `Tarea 1 T${period}` } })
        if (!act1) {
          act1 = await prisma.activity.create({
            data: { institutionId: inst.id, courseAssignmentId: asgn.id, academicPeriodId: pid, insumoId: ins.id, activityTypeId: actType.id, name: `Tarea 1 T${period}`, maxScore: 10, isPublished: true, createdBy: teacherId },
          })
        }
        let act2 = await prisma.activity.findFirst({ where: { courseAssignmentId: asgn.id, academicPeriodId: pid, insumoId: ins.id, name: `Tarea 2 T${period}` } })
        if (!act2) {
          act2 = await prisma.activity.create({
            data: { institutionId: inst.id, courseAssignmentId: asgn.id, academicPeriodId: pid, insumoId: ins.id, activityTypeId: actType.id, name: `Tarea 2 T${period}`, maxScore: 10, isPublished: true, createdBy: teacherId },
          })
        }
        // Examen
        let exam = await prisma.activity.findFirst({ where: { courseAssignmentId: asgn.id, academicPeriodId: pid, activityTypeId: examType.id, insumoId: null } })
        if (!exam) {
          exam = await prisma.activity.create({
            data: { institutionId: inst.id, courseAssignmentId: asgn.id, academicPeriodId: pid, insumoId: null, activityTypeId: examType.id, name: `Examen T${period}`, maxScore: 10, isPublished: true, createdBy: teacherId },
          })
        }
      }
    }

    // — Estudiantes del paralelo —
    const students: string[] = []
    const usedSlugs = new Set<string>()

    for (let si = 0; si < STUDENTS_PER; si++) {
      const { firstName, lastName, slug: rawSlug, dni } = makeStudent(li, 0, si)

      // Slug único
      let slug = rawSlug
      let n = 2
      while (usedSlugs.has(slug)) { slug = `${rawSlug}${n++}` }
      usedSlugs.add(slug)

      const email = `${slug}@demo.edu`
      const student = await prisma.user.upsert({
        where: { institutionId_email: { institutionId: inst.id, email } },
        update: {},
        create: { institutionId: inst.id, email, passwordHash: hash, profile: { create: { firstName, lastName, dni } } },
      })
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: student.id, roleId: roleMap['student'] } }, update: {}, create: { userId: student.id, roleId: roleMap['student'] } })

      await prisma.studentEnrollment.upsert({
        where: { studentId_academicYearId: { studentId: student.id, academicYearId: year.id } },
        update: {},
        create: { institutionId: inst.id, studentId: student.id, parallelId: parallel.id, academicYearId: year.id, status: 'active' },
      })

      // Representante
      const gSlug = `rep${slug}`
      const gEmail = `${gSlug}@demo.edu`
      const guardian = await prisma.user.upsert({
        where: { institutionId_email: { institutionId: inst.id, email: gEmail } },
        update: {},
        create: {
          institutionId: inst.id, email: gEmail, passwordHash: hash,
          profile: { create: { firstName: si % 2 === 0 ? 'María' : 'José', lastName } },
        },
      })
      await prisma.userRole.upsert({ where: { userId_roleId: { userId: guardian.id, roleId: roleMap['guardian'] } }, update: {}, create: { userId: guardian.id, roleId: roleMap['guardian'] } })
      const gLink = await prisma.guardianStudent.findFirst({ where: { guardianId: guardian.id, studentId: student.id } })
      if (!gLink) await prisma.guardianStudent.create({ data: { guardianId: guardian.id, studentId: student.id, relationship: si % 2 === 0 ? 'madre' : 'padre', isPrimary: true } })

      students.push(student.id)
    }

    // — Notas T1 y T2 (todos los estudiantes) —
    for (let si = 0; si < students.length; si++) {
      const studentId = students[si]
      for (let subi = 0; subi < subjects.length; subi++) {
        const sub = subjects[subi]
        const subjectId = subjectMap[sub.code]
        const asgn = await prisma.courseAssignment.findFirst({ where: { subjectId, parallelId: parallel.id, academicYearId: year.id } })
        if (!asgn) continue
        const teacherSlug = isPrimary ? tutorSlug! : SEC_SUBJECT_TEACHER[sub.name]
        const recordedBy = userMap[teacherSlug]

        for (const [pid, period] of [[p1Id, 1], [p2Id, 2]] as [string, 1 | 2][]) {
          const acts = await prisma.activity.findMany({ where: { courseAssignmentId: asgn.id, academicPeriodId: pid }, select: { id: true, activityTypeId: true } })
          for (const act of acts) {
            const g = grade(si, subi, period)
            const variation = act.activityTypeId === examType.id ? 0.1 : (acts.indexOf(act) === 0 ? 0.3 : 0)
            const score = Math.round(Math.min(10, Math.max(0, g + variation)) * 10) / 10
            await prisma.grade.upsert({
              where: { activityId_studentId: { activityId: act.id, studentId } },
              update: { score, gradedBy: recordedBy },
              create: { institutionId: inst.id, activityId: act.id, studentId, score, gradedBy: recordedBy },
            })
          }
        }
      }
    }

    // — Asistencia diaria T2 (solo primaria, algunos ausentes) —
    if (isPrimary) {
      const absenceDates = ['2025-01-15', '2025-01-22', '2025-02-05', '2025-02-19', '2025-03-03']
      for (let si = 0; si < Math.min(5, students.length); si++) {
        const studentId = students[si]
        const dates = absenceDates.slice(0, (si % 3) + 1)
        for (const ds of dates) {
          const existing = await prisma.attendanceRecord.findFirst({ where: { parallelId: parallel.id, studentId, date: new Date(ds) } })
          if (!existing) {
            await prisma.attendanceRecord.create({
              data: { institutionId: inst.id, parallelId: parallel.id, studentId, date: new Date(ds), status: si % 3 === 0 ? 'late' : 'absent', recordedBy: adminId },
            })
          }
        }
      }
    }

    totalStudents += students.length
    console.log(`  ✓ ${lv.name} "A" — ${students.length} estudiantes (${isPrimary ? 'asistencia diaria' : 'por materia'})`)
  }

  // 16. Incidente demo
  const demost8 = await prisma.studentEnrollment.findFirst({
    where: { institutionId: inst.id, academicYearId: year.id, parallel: { level: { code: 'BASIC_8' } } },
    select: { studentId: true },
    skip: 17,
  })
  const incType = await prisma.incidentType.findFirst({ where: { institutionId: inst.id } })
  if (demost8 && incType) {
    const inc = await prisma.disciplinaryIncident.create({
      data: {
        institutionId: inst.id, studentId: demost8.studentId, reportedBy: userMap['carlosespinoza'],
        incidentTypeId: incType.id, incidentDate: new Date('2025-01-15'),
        category: 'disciplinario', severity: 'minor',
        description: 'Estudiante interrumpió la clase en reiteradas ocasiones durante la explicación.',
        workflowState: 'resolved', guardianNotifiedAt: new Date('2025-01-16'),
      },
    })
    await prisma.incidentEvent.create({
      data: { institutionId: inst.id, incidentId: inc.id, actorId: userMap['gabrielaproano'], type: 'note', description: 'Se realizó entrevista con el estudiante y representante. Se llegó a acuerdos de comportamiento.' },
    })
  }

  // ─── Resumen ────────────────────────────────────────────────────────────────
  console.log('\n✅ Escuela demo lista\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Institución : ${INST_NAME}`)
  console.log(`  Código      : ${INST_CODE}`)
  console.log(`  Contraseña  : ${PWD}  (todos los usuarios)`)
  console.log('───────────────────────────────────────────────────────────')
  console.log('  USUARIOS DEMO (login = usuario@demo.edu)')
  console.log(`  Admin       : adminsistema`)
  console.log(`  Rector      : veronicamoreira`)
  console.log(`  DECE        : gabrielaproano`)
  console.log(`  Inspector   : robertochica`)
  console.log(`  Doc. Mat    : carlosespinoza`)
  console.log(`  Doc. Prim   : rosavera  /  luisnaranjo  /  marthacabrera`)
  console.log(`  Estudiante  : sofiatorrres  (8vo A)`)
  console.log(`  Padre       : repsofiatorrres`)
  console.log('───────────────────────────────────────────────────────────')
  console.log(`  Niveles     : 10 (1ro–7mo primaria + 8vo, 9no, 1ro Bach)`)
  console.log(`  Paralelos   : 10 × 1 paralelo "A"`)
  console.log(`  Estudiantes : ${totalStudents} (20 primaria, 25 básica/bachillerato)`)
  console.log(`  Materias    : 4 primaria · 6 básica superior/bachillerato`)
  console.log(`  T1 ✓ T2 ✓ cerrados → boletín y recuperación visible`)
  console.log(`  T3 abierto → flujo de ingreso de notas visible`)
  console.log(`  Primaria    → asistencia diaria (modo tutor)`)
  console.log('═══════════════════════════════════════════════════════════')
}

main()
  .catch((e) => { console.error('\n❌ Error en seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
