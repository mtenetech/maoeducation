/**
 * Helpers puros del motor de notas, fuente ÚNICA de cálculo compartida por
 * boletín, resumen del profesor, "mis notas" del alumno y promoción.
 *
 * Regla (confirmada por el usuario):
 *  - La base de insumos es el PROMEDIO DE LOS PROMEDIOS POR INSUMO (por categoría):
 *    cada insumo promedia sus actividades, y la base promedia esos promedios.
 *    Cada insumo pesa igual (los pesos por-insumo NO se usan).
 *  - Las actividades sin nota se IGNORAN (para un cero, se registra 0 explícito).
 *  - El examen (actividades tipo `exam`) pondera según `examWeight`; el resto, 100 - examWeight.
 */

/** Promedio simple ignorando valores nulos. Devuelve null si no hay ninguno. */
export function average(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter((s): s is number => s != null)
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

/** Normaliza una nota a escala /10 según su puntaje máximo. null si no hay nota. */
export function normalize10(score: number | null | undefined, maxScore: number): number | null {
  if (score == null) return null
  if (!maxScore || maxScore <= 0) return null
  return (score / maxScore) * 10
}

/** Actividad para el cálculo: su nota (cruda), su puntaje máximo y si es examen. */
export interface ScoredActivity {
  score: number | null
  maxScore: number
  isExam: boolean
}

/** Grupo de actividades de un insumo (o "Sin insumo"). */
export interface InsumoGroupInput {
  id: string
  name: string
  activities: ScoredActivity[]
}

/** Promedio de un insumo: promedio de sus actividades NO-examen normalizadas a /10. */
export function insumoGroupAverage(activities: ScoredActivity[]): number | null {
  return average(activities.filter((a) => !a.isExam).map((a) => normalize10(a.score, a.maxScore)))
}

export interface PeriodSummary {
  insumoAvgs: Array<{ id: string; name: string; avg: number | null }>
  insumosBase: number | null
  examAvg: number | null
  hasExam: boolean
  total: number | null
}

/**
 * Total ponderado de un periodo: base de insumos (regular) + examen según su peso.
 * Si no hay examen, el total es la base de insumos.
 */
export function periodTotal(
  regularAvg: number | null,
  examAvg: number | null,
  examWeight: number,
  hasExam: boolean,
): number | null {
  if (hasExam) {
    const regularWeight = 100 - examWeight
    if (regularAvg != null && examAvg != null) {
      return regularAvg * (regularWeight / 100) + examAvg * (examWeight / 100)
    }
    if (regularAvg != null) return regularAvg
    if (examAvg != null) return examAvg
    return null
  }
  return regularAvg
}

/**
 * Resumen canónico de un periodo para una asignación/estudiante:
 * promedio por insumo (por categoría), base de insumos, examen y total ponderado.
 * `hasExam` se basa en que existan actividades de examen (aunque no tengan nota aún).
 */
export function computePeriodSummary(groups: InsumoGroupInput[], examWeight: number): PeriodSummary {
  const insumoAvgs = groups.map((g) => ({
    id: g.id,
    name: g.name,
    avg: insumoGroupAverage(g.activities),
  }))
  const insumosBase = average(insumoAvgs.map((i) => i.avg))

  const examActivities = groups.flatMap((g) => g.activities).filter((a) => a.isExam)
  const examAvg = average(examActivities.map((a) => normalize10(a.score, a.maxScore)))
  const hasExam = examActivities.length > 0

  const total = periodTotal(insumosBase, examAvg, examWeight, hasExam)
  return { insumoAvgs, insumosBase, examAvg, hasExam, total }
}
