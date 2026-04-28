/**
 * Convenciones para pasos select / multi_select:
 * - "Otro": si la opción dispara detalle, el runner pide texto antes de avanzar.
 * - Respuestas mixtas se serializan en JSON para conservar el detalle.
 */

export type SelectWithOtherPayload = { __dilo_other: true; value: string; detail: string }

export type MultiWithOtherPayload = {
  __dilo_multi_other: true
  values: string[]
  detail: string
}

/** Opción tratada como "Otro" y que exige aclaración en texto. */
export function optionTriggersOtherDetail(opt: { label: string; value: string }): boolean {
  const v = opt.value.trim().toLowerCase()
  if (v === 'otro' || v === 'other' || v === '_other' || v.endsWith('_otro')) return true
  const l = opt.label.trim().toLowerCase()
  return l === 'otro' || l === 'otra' || l === 'other' || l === 'others'
}

export function parseSelectStored(raw: string): string | SelectWithOtherPayload {
  try {
    const p = JSON.parse(raw) as unknown
    if (
      p &&
      typeof p === 'object' &&
      (p as SelectWithOtherPayload).__dilo_other === true &&
      typeof (p as SelectWithOtherPayload).value === 'string' &&
      typeof (p as SelectWithOtherPayload).detail === 'string'
    ) {
      return p as SelectWithOtherPayload
    }
  } catch {
    /* texto plano */
  }
  return raw
}

/** Valor de opción principal (para comparar con pills / conteos). */
export function selectStoredPrimaryValue(raw: string): string {
  const p = parseSelectStored(raw)
  return typeof p === 'object' ? p.value : raw
}

export function formatSelectAnswerForDisplay(
  raw: string,
  options: { label: string; value: string }[],
): string {
  const p = parseSelectStored(raw)
  if (typeof p === 'object') {
    const base = options.find((o) => o.value === p.value)?.label ?? 'Otro'
    const d = p.detail.trim()
    return d ? `${base}: ${d}` : base
  }
  return options.find((o) => o.value === raw)?.label ?? raw
}

/** Normaliza respuesta multi_select: array legacy o payload con detalle de "Otro". */
export function normalizeMultiStored(raw: string): { values: string[]; otherDetail: string | null } {
  try {
    const p = JSON.parse(raw) as unknown
    if (Array.isArray(p)) return { values: p.map(String), otherDetail: null }
    if (
      p &&
      typeof p === 'object' &&
      (p as MultiWithOtherPayload).__dilo_multi_other === true &&
      Array.isArray((p as MultiWithOtherPayload).values)
    ) {
      const o = p as MultiWithOtherPayload
      const detail = typeof o.detail === 'string' ? o.detail.trim() : ''
      return { values: o.values.map(String), otherDetail: detail || null }
    }
  } catch {
    /* ignore */
  }
  return { values: [], otherDetail: null }
}

export function formatMultiAnswerForDisplay(
  raw: string,
  options: { label: string; value: string }[],
): string {
  const { values, otherDetail } = normalizeMultiStored(raw)
  if (values.length === 0 && !otherDetail) return raw
  const parts = values.map((val) => options.find((o) => o.value === val)?.label ?? val)
  const joined = parts.join(', ')
  if (otherDetail) return joined ? `${joined} — ${otherDetail}` : otherDetail
  return joined
}

export function selectionNeedsOtherDetail(
  selectedValues: string[],
  options: { label: string; value: string }[],
): boolean {
  for (const val of selectedValues) {
    const opt = options.find((o) => o.value === val)
    if (opt && optionTriggersOtherDetail(opt)) return true
  }
  return false
}

/** Valor guardado en BD / sesión para select con detalle "Otro". */
export function buildSelectOtherStored(value: string, detail: string): string {
  const payload: SelectWithOtherPayload = {
    __dilo_other: true,
    value,
    detail: detail.trim(),
  }
  return JSON.stringify(payload)
}

export function buildMultiOtherStored(values: string[], detail: string): string {
  const payload: MultiWithOtherPayload = {
    __dilo_multi_other: true,
    values,
    detail: detail.trim(),
  }
  return JSON.stringify(payload)
}

/** Para analytics: clave de conteo en select (siempre el value de opción, no el JSON completo). */
export function selectValueForAnalyticsCount(raw: string): string {
  const p = parseSelectStored(raw)
  return typeof p === 'object' ? p.value : raw.trim()
}
