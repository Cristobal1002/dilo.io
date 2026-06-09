import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { supportCases } from '@/db/schema'
import {
  SUPPORT_STATUSES,
  type SupportFilterStatus,
  type SupportPriority,
  type SupportStatus,
} from '@/lib/support'

const OPEN_STATUSES: SupportStatus[] = ['new', 'in_progress', 'waiting']

export type PortalCasesFilter = SupportFilterStatus | 'open'

export type PortalCaseRow = {
  id: string
  caseNumber: number
  subject: string
  description: string | null
  status: SupportStatus
  priority: SupportPriority
  reportedPriority: SupportPriority
  type: string
  requesterName: string | null
  requesterEmail: string | null
  clientNotes: string | null
  resolutionNotes: string | null
  dueAt: Date | null
  lastActivityAt: Date
  createdAt: Date
}

export async function loadPortalCases(args: {
  organizationId: string
  clientId: string
  statusFilter: PortalCasesFilter
}): Promise<PortalCaseRow[]> {
  const conditions = [
    eq(supportCases.organizationId, args.organizationId),
    eq(supportCases.clientId, args.clientId),
  ]

  if (args.statusFilter === 'all') {
    // no extra filter
  } else if (args.statusFilter === 'open') {
    conditions.push(inArray(supportCases.status, OPEN_STATUSES))
  } else {
    conditions.push(eq(supportCases.status, args.statusFilter))
  }

  const rows = await db
    .select({
      id: supportCases.id,
      caseNumber: supportCases.caseNumber,
      subject: supportCases.subject,
      description: supportCases.description,
      status: supportCases.status,
      priority: supportCases.priority,
      reportedPriority: supportCases.reportedPriority,
      type: supportCases.type,
      requesterName: supportCases.requesterName,
      requesterEmail: supportCases.requesterEmail,
      clientNotes: supportCases.clientNotes,
      resolutionNotes: supportCases.resolutionNotes,
      dueAt: supportCases.dueAt,
      lastActivityAt: supportCases.lastActivityAt,
      createdAt: supportCases.createdAt,
    })
    .from(supportCases)
    .where(and(...conditions))
    .orderBy(
      sql`CASE ${supportCases.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
      desc(supportCases.lastActivityAt),
    )

  return rows.map((r) => ({
    ...r,
    status: r.status as SupportStatus,
    priority: r.priority as SupportPriority,
    reportedPriority: r.reportedPriority as SupportPriority,
  }))
}

export function isPortalStatusFilter(value: string | null): value is PortalCasesFilter {
  if (value === 'open') return true
  return value === 'all' || SUPPORT_STATUSES.includes(value as SupportStatus)
}
