import { and, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clients, organizations, supportCases } from '@/db/schema'
import {
  type SupportReportCaseLine,
  type SupportReportCompanyGroup,
  type SupportValueReportPreview,
  listRecentReportMonths,
  monthBoundsUtc,
  parseReportMonth,
  roundReportHours,
  roundReportUsd,
} from '@/lib/support-value-report-shared'

export type {
  SupportReportMonth,
  SupportReportCaseLine,
  SupportReportCompanyGroup,
  SupportValueReportPreview,
} from '@/lib/support-value-report-shared'

export {
  formatUsd,
  listRecentReportMonths,
  monthBoundsUtc,
  parseReportMonth,
} from '@/lib/support-value-report-shared'

const REPORTABLE_STATUSES = ['closed', 'resolved'] as const

function toIso(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString()
  if (typeof d === 'string') {
    const dt = new Date(d)
    return Number.isFinite(dt.getTime()) ? dt.toISOString() : null
  }
  return null
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const m0 = year * 12 + (month - 1) + delta
  const y = Math.floor(m0 / 12)
  const m = (m0 % 12) + 1
  return { year: y, month: m }
}

export type SupportValueReportTrendPoint = {
  month: string
  monthLabel: string
  totalCases: number
  totalHours: number
  improvements: number
  support: number
  estimatedValueUsd: number | null
}

export async function loadSupportValueReportTrend(args: {
  organizationId: string
  month: string
  monthsBack?: number
  clientId?: string | null
}): Promise<SupportValueReportTrendPoint[] | null> {
  const parsed = parseReportMonth(args.month)
  if (!parsed) return null

  const monthsBack = args.monthsBack ?? 3
  const points: SupportValueReportTrendPoint[] = []

  for (let i = monthsBack - 1; i >= 0; i--) {
    const { year, month } = shiftMonth(parsed.year, parsed.month, -i)
    const m = monthKey(year, month)
    const preview = await loadSupportValueReportPreview({
      organizationId: args.organizationId,
      month: m,
      clientId: args.clientId ?? null,
    })
    if (!preview) return null

    // Conteos por tipo (solo para casos reportables y con horas > 0, consistente con preview)
    const { start, end, label } = monthBoundsUtc(year, month)
    const activityInMonth = or(
      and(gte(supportCases.resolvedAt, start), lt(supportCases.resolvedAt, end)),
      and(
        isNull(supportCases.resolvedAt),
        gte(supportCases.lastActivityAt, start),
        lt(supportCases.lastActivityAt, end),
      ),
    )!

    const whereParts = [
      eq(supportCases.organizationId, args.organizationId),
      inArray(supportCases.status, [...REPORTABLE_STATUSES]),
      sql`${supportCases.hoursSpent} IS NOT NULL AND ${supportCases.hoursSpent} > 0`,
      activityInMonth,
    ]
    if (args.clientId?.trim()) whereParts.push(eq(supportCases.clientId, args.clientId.trim()))

    const typeRows = await db
      .select({
        type: supportCases.type,
        n: sql<number>`count(*)::int`,
      })
      .from(supportCases)
      .where(and(...whereParts))
      .groupBy(supportCases.type)

    const improvements = typeRows.find((r) => r.type === 'improvement')?.n ?? 0
    const support = typeRows.find((r) => r.type === 'support')?.n ?? 0

    points.push({
      month: m,
      monthLabel: preview.monthLabel,
      totalCases: preview.totalCases,
      totalHours: preview.totalHours,
      improvements,
      support,
      estimatedValueUsd: preview.estimatedValueUsd,
    })
  }

  return points
}

export async function loadSupportValueReportPreview(args: {
  organizationId: string
  month: string
  clientId?: string | null
}): Promise<SupportValueReportPreview | null> {
  const parsed = parseReportMonth(args.month)
  if (!parsed) return null

  const { start, end, label } = monthBoundsUtc(parsed.year, parsed.month)

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, args.organizationId),
    columns: {
      supportContractPrompt: true,
      supportHourlyRateUsd: true,
    },
  })

  const hourlyRateUsd =
    org?.supportHourlyRateUsd != null && org.supportHourlyRateUsd > 0
      ? roundReportUsd(org.supportHourlyRateUsd)
      : null

  const activityInMonth = or(
    and(gte(supportCases.resolvedAt, start), lt(supportCases.resolvedAt, end)),
    and(
      isNull(supportCases.resolvedAt),
      gte(supportCases.lastActivityAt, start),
      lt(supportCases.lastActivityAt, end),
    ),
  )!

  const whereParts = [
    eq(supportCases.organizationId, args.organizationId),
    inArray(supportCases.status, [...REPORTABLE_STATUSES]),
    sql`${supportCases.hoursSpent} IS NOT NULL AND ${supportCases.hoursSpent} > 0`,
    activityInMonth,
  ]

  const clientIdFilter = args.clientId?.trim()
  if (clientIdFilter) {
    whereParts.push(eq(supportCases.clientId, clientIdFilter))
  }

  const rows = await db
    .select({
      id: supportCases.id,
      caseNumber: supportCases.caseNumber,
      subject: supportCases.subject,
      hoursSpent: supportCases.hoursSpent,
      status: supportCases.status,
      clientId: supportCases.clientId,
      clientName: clients.name,
      clientCompanyFallback: supportCases.clientCompany,
      resolvedAt: supportCases.resolvedAt,
    })
    .from(supportCases)
    .leftJoin(
      clients,
      and(eq(clients.id, supportCases.clientId), eq(clients.organizationId, supportCases.organizationId)),
    )
    .where(and(...whereParts))
    .orderBy(clients.name, supportCases.caseNumber)

  const byCompany = new Map<string, SupportReportCaseLine[]>()

  for (const r of rows) {
    const hours = Number(r.hoursSpent) || 0
    if (hours <= 0) continue
    const company =
      r.clientName?.trim() ||
      r.clientCompanyFallback?.trim() ||
      (r.clientId ? 'Cliente' : 'Sin empresa')
    const list = byCompany.get(company) ?? []
    list.push({
      id: r.id,
      caseNumber: r.caseNumber,
      subject: r.subject,
      hoursSpent: roundReportHours(hours),
      status: r.status,
      resolvedAt: toIso(r.resolvedAt),
    })
    byCompany.set(company, list)
  }

  const companies: SupportReportCompanyGroup[] = [...byCompany.entries()]
    .map(([clientCompany, cases]) => {
      const totalHours = roundReportHours(cases.reduce((s, c) => s + c.hoursSpent, 0))
      return {
        clientCompany,
        totalHours,
        caseCount: cases.length,
        estimatedValueUsd: hourlyRateUsd != null ? roundReportUsd(totalHours * hourlyRateUsd) : null,
        cases,
      }
    })
    .sort((a, b) => b.totalHours - a.totalHours)

  const totalHours = roundReportHours(companies.reduce((s, c) => s + c.totalHours, 0))
  const totalCases = companies.reduce((s, c) => s + c.caseCount, 0)

  return {
    month: args.month,
    monthLabel: label,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    hourlyRateUsd,
    hasContractPrompt: Boolean(org?.supportContractPrompt?.trim()),
    totalHours,
    totalCases,
    estimatedValueUsd: hourlyRateUsd != null ? roundReportUsd(totalHours * hourlyRateUsd) : null,
    companies,
  }
}
