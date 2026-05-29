import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

interface PeriodGrade {
  periodId: string
  periodName: string
  total: number | null
}
interface SubjectRow {
  subjectName: string
  periodGrades: PeriodGrade[]
  finalAverage: number | null
}
interface PeriodCol {
  id: string
  name: string
}
interface AttendanceRow {
  periodName: string
  justifiedAbsences: number
  unjustifiedAbsences: number
  lateCount: number
}

export interface BulletinPdfData {
  institutionName: string
  title: string
  logoUrl: string | null
  directorName: string
  directorRole: string
  teacherLabel: string
  studentName: string
  studentDni: string | null
  parallelName: string
  levelName: string
  tutorName: string
  yearName: string
  periods: PeriodCol[]
  subjects: SubjectRow[]
  overallAverage: number | null
  attendanceByPeriod: AttendanceRow[]
}

const NUM = (n: number | null) => (n == null ? '—' : n.toFixed(2))

// Equivalencia cualitativa (misma escala que el boletín HTML actual)
function cualitativa(v: number | null): string {
  if (v == null) return '—'
  if (v >= 9) return 'DA'
  if (v >= 7) return 'AA'
  if (v >= 4.01) return 'PA'
  return 'NA'
}

/** Resuelve el logo a algo que pdfkit pueda embeber: Buffer (data URI) o ruta en disco. */
function resolveLogo(logoUrl: string | null): Buffer | string | null {
  if (!logoUrl) return null
  // data URI base64 (cómo se guardan ahora los logos, para persistir en hostings efímeros)
  const dm = /^data:[^;]+;base64,(.+)$/.exec(logoUrl)
  if (dm) {
    try {
      return Buffer.from(dm[1], 'base64')
    } catch {
      return null
    }
  }
  // legacy: archivo en /uploads/...
  const m = /\/uploads\/(.+)$/.exec(logoUrl)
  if (!m) return null
  const p = path.join(process.cwd(), 'uploads', m[1])
  return fs.existsSync(p) ? p : null
}

export function buildBulletinPdf(data: BulletinPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const left = doc.page.margins.left
    let y = doc.page.margins.top

    // ── Encabezado ──
    const logo = resolveLogo(data.logoUrl)
    let hasLogo = false
    if (logo) {
      try {
        doc.image(logo, left, y, { fit: [46, 46] })
        hasLogo = true
      } catch {
        /* logo inválido (p.ej. SVG, que pdfkit no soporta): se ignora */
      }
    }
    const headX = left + (hasLogo ? 56 : 0)
    doc.font('Helvetica-Bold').fontSize(13).text(data.institutionName.toUpperCase(), headX, y, {
      width: pageW - (hasLogo ? 56 : 0),
    })
    doc.font('Helvetica-Bold').fontSize(10).text(data.title || 'INFORME DE CALIFICACIONES', headX, doc.y + 1)
    y = Math.max(y + 50, doc.y + 6)

    // ── Datos del estudiante ──
    doc.font('Helvetica').fontSize(8.5)
    const info = [
      `Estudiante: ${data.studentName}`,
      data.studentDni ? `Cédula: ${data.studentDni}` : '',
      `Curso: ${data.levelName} "${data.parallelName}"`,
      `Año lectivo: ${data.yearName}`,
    ].filter(Boolean)
    doc.text(info.join('     '), left, y)
    y = doc.y + 8

    // ── Tabla de calificaciones ──
    const periods = data.periods
    const subjColW = 200
    const finalColW = 52
    const cualColW = 44
    const periodColW = Math.max(
      48,
      (pageW - subjColW - finalColW - cualColW) / Math.max(periods.length, 1),
    )
    const rowH = 18
    const headH = 20

    const xs = {
      subj: left,
      periods: periods.map((_, i) => left + subjColW + i * periodColW),
      final: left + subjColW + periods.length * periodColW,
      cual: left + subjColW + periods.length * periodColW + finalColW,
    }
    const tableW = subjColW + periods.length * periodColW + finalColW + cualColW

    // Cabecera
    doc.rect(left, y, tableW, headH).fill('#1e293b')
    doc.fill('#ffffff').font('Helvetica-Bold').fontSize(8)
    doc.text('ASIGNATURA', xs.subj + 4, y + 6, { width: subjColW - 6 })
    periods.forEach((p, i) => {
      doc.text(p.name, xs.periods[i], y + 6, { width: periodColW, align: 'center' })
    })
    doc.text('FINAL', xs.final, y + 6, { width: finalColW, align: 'center' })
    doc.text('EQUIV.', xs.cual, y + 6, { width: cualColW, align: 'center' })
    y += headH

    // Filas
    doc.font('Helvetica').fontSize(8).fill('#000000')
    data.subjects.forEach((s, idx) => {
      if (idx % 2 === 1) doc.rect(left, y, tableW, rowH).fill('#f1f5f9').fill('#000000')
      doc.fill('#000000')
      doc.text(s.subjectName, xs.subj + 4, y + 5, { width: subjColW - 6, ellipsis: true })
      periods.forEach((p, i) => {
        const pg = s.periodGrades.find((g) => g.periodId === p.id)
        doc.text(NUM(pg?.total ?? null), xs.periods[i], y + 5, { width: periodColW, align: 'center' })
      })
      doc.font('Helvetica-Bold').text(NUM(s.finalAverage), xs.final, y + 5, { width: finalColW, align: 'center' })
      doc.text(cualitativa(s.finalAverage), xs.cual, y + 5, { width: cualColW, align: 'center' })
      doc.font('Helvetica')
      // borde inferior
      doc.moveTo(left, y + rowH).lineTo(left + tableW, y + rowH).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
      y += rowH
    })

    // Promedio general
    doc.font('Helvetica-Bold').fontSize(8.5)
    doc.text('PROMEDIO GENERAL', xs.subj + 4, y + 5, { width: subjColW + periods.length * periodColW - 6 })
    doc.text(NUM(data.overallAverage), xs.final, y + 5, { width: finalColW, align: 'center' })
    doc.text(cualitativa(data.overallAverage), xs.cual, y + 5, { width: cualColW, align: 'center' })
    y += rowH + 10

    // ── Asistencia ──
    if (data.attendanceByPeriod.length > 0) {
      doc.font('Helvetica-Bold').fontSize(8.5).text('Asistencia', left, y)
      y = doc.y + 2
      doc.font('Helvetica').fontSize(8)
      data.attendanceByPeriod.forEach((a) => {
        doc.text(
          `${a.periodName}:  faltas justif. ${a.justifiedAbsences} · injustif. ${a.unjustifiedAbsences} · atrasos ${a.lateCount}`,
          left,
          doc.y + 1,
        )
      })
      y = doc.y + 14
    }

    // ── Escala + Firmas ──
    doc.font('Helvetica').fontSize(7).fill('#475569')
    doc.text('Escala: DA = Domina (9–10) · AA = Alcanza (7–8.99) · PA = Próximo (4.01–6.99) · NA = No alcanza (≤4)', left, y)
    doc.fill('#000000')

    const signY = doc.page.height - doc.page.margins.bottom - 38
    const colW = pageW / 2
    doc.fontSize(8)
    doc.text('_______________________________', left, signY, { width: colW, align: 'center' })
    doc.text(`${data.tutorName || ''}`, left, signY + 12, { width: colW, align: 'center' })
    doc.text(data.teacherLabel || 'DOCENTE TUTOR/A', left, signY + 23, { width: colW, align: 'center' })
    doc.text('_______________________________', left + colW, signY, { width: colW, align: 'center' })
    doc.text(`${data.directorName || ''}`, left + colW, signY + 12, { width: colW, align: 'center' })
    doc.text(data.directorRole || 'DIRECTOR/A', left + colW, signY + 23, { width: colW, align: 'center' })

    doc.end()
  })
}
