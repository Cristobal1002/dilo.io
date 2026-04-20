/** Formatea el valor guardado de una respuesta para UI (tablas, detalle de sesión). */
export function formatFlowAnswerDisplay(
  type: string,
  raw: string | null,
  opts: { label: string; value: string }[],
): string {
  if (!raw) return '—'
  if (type === 'file') {
    try {
      const p = JSON.parse(raw) as { skipped?: boolean; items?: { name: string }[] }
      if (p.skipped) return '(omitido)'
      if (Array.isArray(p.items)) return p.items.map((i) => i.name).join(', ')
    } catch {
      /* ignore */
    }
    return raw
  }
  if (type === 'multi_select') {
    try {
      const arr = JSON.parse(raw) as string[]
      return arr.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ')
    } catch {
      return raw
    }
  }
  if (type === 'select') return opts.find((o) => o.value === raw)?.label ?? raw
  if (type === 'yes_no') return raw === 'yes' ? 'Sí' : raw === 'no' ? 'No' : raw
  return raw
}
