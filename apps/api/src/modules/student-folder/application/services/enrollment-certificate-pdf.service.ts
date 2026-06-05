import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

export interface EnrollmentCertificatePdfData {
  institutionName: string
  logoUrl: string | null
  studentName: string
  studentDni: string | null
  levelName: string
  parallelName: string
  yearName: string
  enrolledAt: Date
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  withdrawn: 'Retirado',
  transferred: 'Trasladado',
}

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

/** Resuelve el logo a algo que pdfkit pueda embeber: Buffer (data URI) o ruta en disco. */
function resolveLogo(logoUrl: string | null): Buffer | string | null {
  if (!logoUrl) return null
  const dm = /^data:[^;]+;base64,(.+)$/.exec(logoUrl)
  if (dm) {
    try {
      return Buffer.from(dm[1], 'base64')
    } catch {
      return null
    }
  }
  const m = /\/uploads\/(.+)$/.exec(logoUrl)
  if (!m) return null
  const p = path.join(process.cwd(), 'uploads', m[1])
  return fs.existsSync(p) ? p : null
}

/** Genera el certificado de matrícula y lo devuelve como Buffer. */
export function buildEnrollmentCertificatePdf(data: EnrollmentCertificatePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Logo (opcional)
    const logo = resolveLogo(data.logoUrl)
    if (logo) {
      try {
        doc.image(logo, doc.page.width / 2 - 30, doc.y, { width: 60, align: 'center' })
        doc.moveDown(3.5)
      } catch {
        // si el logo no es válido, se omite
      }
    }

    // Encabezado
    doc.fontSize(16).font('Helvetica-Bold').text(data.institutionName.toUpperCase(), { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(13).text('CERTIFICADO DE MATRÍCULA', { align: 'center' })
    doc.moveDown(2)

    // Cuerpo
    doc.fontSize(11).font('Helvetica')
    doc.text(
      'La institución educativa certifica que el/la estudiante se encuentra matriculado/a según el siguiente detalle:',
      { align: 'justify' },
    )
    doc.moveDown(1.2)

    const row = (label: string, value: string) => {
      doc.font('Helvetica-Bold').fontSize(11).text(`${label}: `, { continued: true })
      doc.font('Helvetica').text(value || '—')
      doc.moveDown(0.2)
    }
    row('Estudiante', data.studentName)
    row('Cédula', data.studentDni ?? '—')
    row('Nivel', data.levelName)
    row('Paralelo', data.parallelName)
    row('Año lectivo', data.yearName)
    row('Fecha de matrícula', fmtDate(data.enrolledAt))
    row('Estado', STATUS_LABELS[data.status] ?? data.status)

    doc.moveDown(2)
    doc.fontSize(10).text(`Se expide el presente certificado a los ${fmtDate(new Date())}.`, {
      align: 'justify',
    })

    // Firma
    doc.moveDown(5)
    doc.fontSize(10).text('_______________________________', { align: 'center' })
    doc.text('Secretaría / Rectorado', { align: 'center' })

    doc.end()
  })
}
