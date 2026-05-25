/** Tipos y utilidades del informe de valor — seguras para componentes cliente (sin db/env). */

export type SupportReportMonth = { year: number; month: number; label: string; value: string }

export type SupportReportCaseLine = {
  id: string
  caseNumber: number
  subject: string
  hoursSpent: number
  status: string
  resolvedAt: string | null
}

export type SupportReportCompanyGroup = {
  clientCompany: string
  totalHours: number
  caseCount: number
  estimatedValueUsd: number | null
  cases: SupportReportCaseLine[]
}

export type SupportValueReportPreview = {
  month: string
  monthLabel: string
  periodStart: string
  periodEnd: string
  hourlyRateUsd: number | null
  hasContractPrompt: boolean
  totalHours: number
  totalCases: number
  estimatedValueUsd: number | null
  companies: SupportReportCompanyGroup[]
}

export function parseReportMonth(raw: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return { year, month }
}

export function monthBoundsUtc(year: number, month: number): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  const label = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start)
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) }
}

export function listRecentReportMonths(count = 12): SupportReportMonth[] {
  const out: SupportReportMonth[] = []
  const now = new Date()
  let y = now.getUTCFullYear()
  let m = now.getUTCMonth() + 1
  for (let i = 0; i < count; i++) {
    const value = `${y}-${String(m).padStart(2, '0')}`
    const { label } = monthBoundsUtc(y, m)
    out.push({ year: y, month: m, label, value })
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return out
}

export function formatUsd(amount: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    amount,
  )
}

export function roundReportHours(n: number): number {
  return Math.round(n * 100) / 100
}

export function roundReportUsd(n: number): number {
  return Math.round(n * 100) / 100
}
