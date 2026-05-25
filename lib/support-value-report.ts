import { and, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, supportCases } from '@/db/schema'
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

export async function loadSupportValueReportPreview(args: {
  organizationId: string
  month: string
  clientCompany?: string | null
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

  const companyFilter = args.clientCompany?.trim()
  if (companyFilter) {
    whereParts.push(eq(supportCases.clientCompany, companyFilter))
  }

  const rows = await db
    .select({
      id: supportCases.id,
      caseNumber: supportCases.caseNumber,
      subject: supportCases.subject,
      hoursSpent: supportCases.hoursSpent,
      status: supportCases.status,
      clientCompany: supportCases.clientCompany,
      resolvedAt: supportCases.resolvedAt,
    })
    .from(supportCases)
    .where(and(...whereParts))
    .orderBy(supportCases.clientCompany, supportCases.caseNumber)

  const byCompany = new Map<string, SupportReportCaseLine[]>()

  for (const r of rows) {
    const hours = Number(r.hoursSpent) || 0
    if (hours <= 0) continue
    const company = r.clientCompany?.trim() || 'Sin empresa'
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
