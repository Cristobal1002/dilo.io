import { type SQL, and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { flows, supportCases, users } from '@/db/schema'
import type { SupportAssigneeFilter, SupportFilterStatus } from '@/lib/support'

export type SupportCaseOverviewRow = {
  id: string
  caseNumber: number
  status: string
  priority: string
  type: string
  subject: string
  requesterName: string | null
  requesterEmail: string | null
  clientCompany: string | null
  flowId: string | null
  flowName: string | null
  assignedUserId: string | null
  assigneeName: string | null
  lastActivityAt: string
  createdAt: string
  updatedAt: string
}

function toIso(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString()
  if (typeof d === 'string') {
    const dt = new Date(d)
    return Number.isFinite(dt.getTime()) ? dt.toISOString() : null
  }
  return null
}

function toIsoRequired(d: unknown): string {
  return toIso(d) ?? new Date(0).toISOString()
}

function sanitizeSearchFragment(q: string): string {
  return q.replace(/%/g, '').replace(/_/g, '').trim()
}

export type LoadSupportCasesPageInput = {
  organizationId: string
  status: SupportFilterStatus
  q?: string | null
  flowId?: string | null
  assignee: SupportAssigneeFilter
  currentUserId: string
  page: number
  pageSize: number
}

export async function loadSupportCasesPage(
  input: LoadSupportCasesPageInput,
): Promise<{ cases: SupportCaseOverviewRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page)
  const pageSize = Math.min(100, Math.max(1, input.pageSize))
  const q = input.q?.trim() || ''
  const flowParsed = z.string().uuid().safeParse(input.flowId?.trim())
  const flowFilterId = flowParsed.success ? flowParsed.data : null

  const whereParts: SQL[] = [eq(supportCases.organizationId, input.organizationId)]
  if (input.status !== 'all') {
    whereParts.push(eq(supportCases.status, input.status))
  }
  if (flowFilterId) {
    whereParts.push(eq(supportCases.flowId, flowFilterId))
  }
  if (input.assignee === 'me') {
    whereParts.push(eq(supportCases.assignedUserId, input.currentUserId))
  } else if (input.assignee === 'unassigned') {
    whereParts.push(isNull(supportCases.assignedUserId))
  }

  const qSafe = sanitizeSearchFragment(q)
  if (qSafe.length > 0) {
    const like = `%${qSafe}%`
    const num = parseInt(qSafe, 10)
    const searchParts: SQL[] = [
      ilike(supportCases.subject, like),
      ilike(supportCases.requesterName, like),
      ilike(supportCases.requesterEmail, like),
      ilike(supportCases.clientCompany, like),
    ]
    if (Number.isFinite(num) && num > 0) {
      searchParts.push(eq(supportCases.caseNumber, num))
    }
    whereParts.push(or(...searchParts)!)
  }

  const fullWhere = whereParts.length === 1 ? whereParts[0]! : and(...whereParts)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportCases)
    .where(fullWhere)

  const total = Number(count) || 0
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: supportCases.id,
      caseNumber: supportCases.caseNumber,
      status: supportCases.status,
      priority: supportCases.priority,
      type: supportCases.type,
      subject: supportCases.subject,
      requesterName: supportCases.requesterName,
      requesterEmail: supportCases.requesterEmail,
      clientCompany: supportCases.clientCompany,
      flowId: supportCases.flowId,
      assignedUserId: supportCases.assignedUserId,
      lastActivityAt: supportCases.lastActivityAt,
      createdAt: supportCases.createdAt,
      updatedAt: supportCases.updatedAt,
    })
    .from(supportCases)
    .where(fullWhere)
    .orderBy(desc(supportCases.lastActivityAt), desc(supportCases.createdAt))
    .limit(pageSize)
    .offset(offset)

  const flowIds = [...new Set(rows.map((r) => r.flowId).filter(Boolean))] as string[]
  const assigneeIds = [...new Set(rows.map((r) => r.assignedUserId).filter(Boolean))] as string[]

  const flowNameById = new Map<string, string>()
  if (flowIds.length > 0) {
    const flowRows = await db.query.flows.findMany({
      where: and(eq(flows.organizationId, input.organizationId), inArray(flows.id, flowIds)),
      columns: { id: true, name: true },
    })
    for (const f of flowRows) flowNameById.set(f.id, f.name)
  }

  const assigneeNameById = new Map<string, string>()
  if (assigneeIds.length > 0) {
    const userRows = await db.query.users.findMany({
      where: and(eq(users.organizationId, input.organizationId), inArray(users.id, assigneeIds)),
      columns: { id: true, name: true, email: true },
    })
    for (const u of userRows) {
      assigneeNameById.set(u.id, u.name?.trim() || u.email)
    }
  }

  const cases: SupportCaseOverviewRow[] = rows.map((r) => ({
    id: r.id,
    caseNumber: r.caseNumber,
    status: r.status,
    priority: r.priority,
    type: r.type,
    subject: r.subject,
    requesterName: r.requesterName,
    requesterEmail: r.requesterEmail,
    clientCompany: r.clientCompany,
    flowId: r.flowId,
    flowName: r.flowId ? flowNameById.get(r.flowId) ?? null : null,
    assignedUserId: r.assignedUserId,
    assigneeName: r.assignedUserId ? assigneeNameById.get(r.assignedUserId) ?? null : null,
    lastActivityAt: toIsoRequired(r.lastActivityAt),
    createdAt: toIsoRequired(r.createdAt),
    updatedAt: toIsoRequired(r.updatedAt),
  }))

  return { cases, total, page, pageSize }
}
