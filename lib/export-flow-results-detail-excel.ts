import type { DetailTableRow, FlowResultsDetailTable } from '@/lib/flow-results-detail-table'

const classificationLabel: Record<string, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

function formatCompletedAt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

function classificationDisplay(value: string | null): string {
  if (!value) return ''
  return classificationLabel[value] ?? value
}

export function sanitizeExcelFilenameBase(name: string): string {
  const s = name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
  return s.slice(0, 80) || 'resultados'
}

/**
 * Exporta las filas del detalle (mismas columnas que la tabla) a un .xlsx descargable en el navegador.
 */
export async function downloadDetailTableExcel(
  rows: DetailTableRow[],
  detailTable: FlowResultsDetailTable,
  filenameBase: string,
): Promise<void> {
  if (rows.length === 0) return

  const XLSX = await import('xlsx')

  const headers: string[] = ['Clasificación']
  if (detailTable.hasScores) headers.push('Score')
  headers.push('Fecha', 'Nombre')
  for (const c of detailTable.contactColumns) headers.push(c.label)
  for (const c of detailTable.stepColumns) headers.push(c.fullQuestion)

  const aoa: (string | number)[][] = [headers]

  for (const r of rows) {
    const line: (string | number)[] = []
    line.push(classificationDisplay(r.classification))
    if (detailTable.hasScores) {
      line.push(r.score != null && Number.isFinite(r.score) ? r.score : '')
    }
    line.push(formatCompletedAt(r.completedAt))
    line.push(r.displayName || '')
    for (const c of detailTable.contactColumns) {
      line.push((r.contact[c.key] ?? '').trim() ? String(r.contact[c.key]) : '')
    }
    for (const c of detailTable.stepColumns) {
      const cell = r.stepCells[c.stepId] ?? ''
      line.push(cell === '—' ? '' : cell)
    }
    aoa.push(line)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Detalle')

  const safe = sanitizeExcelFilenameBase(filenameBase)
  const day = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${safe}-detalle-${day}.xlsx`)
}
