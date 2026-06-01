/**
 * Helpers puros del motor de notas, compartidos entre boletín y promoción.
 * El promedio es plano por actividad/periodo (el usuario confirmó NO usar pesos de insumo).
 */

/** Promedio simple ignorando valores nulos. Devuelve null si no hay ninguno. */
export function average(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter((s): s is number => s != null)
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

/**
 * Total ponderado de un periodo: promedio de insumos (regular) + examen según su peso.
 * Si no hay examen, el total es el promedio regular.
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
