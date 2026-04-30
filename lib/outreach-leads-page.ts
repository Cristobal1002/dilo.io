import { type SQL, and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { flows, outreachEmails, outreachLeads } from '@/db/schema'
import type { OutreachFilterStatus } from '@/lib/outreach'

export type OutreachLeadOverviewRow = {
  id: string
  name: string
  email: string
  company: string | null
  role: string | null
  status: string
  notes: string | null
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
  emailCount: number
  totalOpens: number
  totalClicks: number
  lastSentAt: string | null
  lastCampaignFlowId: string | null
  lastCampaignFlowName: string | null
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
  const v = toIso(d)
  return v ?? new Date(0).toISOString()
}

/** Evita que `%` / `_` del usuario actúen como comodines ILIKE. */
function sanitizeSearchFragment(q: string): string {
  return q.replace(/%/g, '').replace(/_/g, '').trim()
}

export type LoadOutreachLeadsPageInput = {
  organizationId: string
  status: OutreachFilterStatus
  /** Búsqueda por nombre (ILIKE parcial). */
  q?: string | null
  /** Solo leads con al menos un envío registrado con este flow (campaña). */
  flowId?: string | null
  page: number
  pageSize: number
}

export async function loadOutreachLeadsPage(
  input: LoadOutreachLeadsPageInput,
): Promise<{ leads: OutreachLeadOverviewRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page)
  const pageSize = Math.min(100, Math.max(1, input.pageSize))
  const q = input.q?.trim() || ''
  const flowParsed = z.string().uuid().safeParse(input.flowId?.trim())
  const flowFilterId = flowParsed.success ? flowParsed.data : null

  const whereBase = and(eq(outreachLeads.organizationId, input.organizationId), isNull(outreachLeads.deletedAt))
  const statusWhere =
    input.status === 'all' ? whereBase : and(whereBase, eq(outreachLeads.status, input.status))

  const qSafe = sanitizeSearchFragment(q)
  const nameSearch =
    qSafe.length > 0
      ? or(ilike(outreachLeads.name, `%${qSafe}%`), ilike(outreachLeads.email, `%${qSafe}%`))
      : undefined

  /** Por flow: `IN (subquery)` evita `exists` correlacionado con la query API en prod. */
  const flowInSubquery: SQL | undefined = flowFilterId
    ? sql`${outreachLeads.id} IN (
        SELECT ${outreachEmails.leadId}
        FROM ${outreachEmails}
        WHERE ${outreachEmails.flowId} = ${flowFilterId}
      )`
    : undefined

  const whereParts: SQL[] = [statusWhere as SQL]
  if (nameSearch) whereParts.push(nameSearch)
  if (flowInSubquery) whereParts.push(flowInSubquery)
  const fullWhere = whereParts.length === 1 ? whereParts[0]! : and(...whereParts)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachLeads)
    .where(fullWhere)

  const total = Number(count) || 0
  const offset = (page - 1) * pageSize

  const leads = await db
    .select()
    .from(outreachLeads)
    .where(fullWhere)
    .orderBy(desc(outreachLeads.lastActivityAt), desc(outreachLeads.createdAt))
    .limit(pageSize)
    .offset(offset)

  const ids = leads.map((l) => l.id)
  const agg =
    ids.length === 0
      ? []
      : await db
          .select({
            leadId: outreachEmails.leadId,
            emailCount: sql<number>`count(*)::int`,
            totalOpens: sql<number>`coalesce(sum(${outreachEmails.openCount}), 0)::int`,
            totalClicks: sql<number>`coalesce(sum(${outreachEmails.clickCount}), 0)::int`,
            lastSent: sql<Date | null>`max(${outreachEmails.sentAt})`,
          })
          .from(outreachEmails)
          .where(inArray(outreachEmails.leadId, ids))
          .groupBy(outreachEmails.leadId)

  const aggMap = new Map(agg.map((r) => [r.leadId, r]))

  const lastFlowByLead = new Map<string, string | null>()
  if (ids.length > 0) {
    const emailRows = await db
      .select({
        leadId: outreachEmails.leadId,
        flowId: outreachEmails.flowId,
        sentAt: outreachEmails.sentAt,
      })
      .from(outreachEmails)
      .where(inArray(outreachEmails.leadId, ids))
      .orderBy(asc(outreachEmails.leadId), desc(outreachEmails.sentAt))

    for (const row of emailRows) {
      if (!lastFlowByLead.has(row.leadId)) {
        lastFlowByLead.set(row.leadId, row.flowId ?? null)
      }
    }
  }

  const flowIds = [...new Set([...lastFlowByLead.values()].filter(Boolean))] as string[]
  const flowNameById = new Map<string, string>()
  if (flowIds.length > 0) {
    const frows = await db.query.flows.findMany({
      where: and(eq(flows.organizationId, input.organizationId), inArray(flows.id, flowIds)),
      columns: { id: true, name: true },
    })
    for (const f of frows) {
      flowNameById.set(f.id, f.name)
    }
  }

  const overview: OutreachLeadOverviewRow[] = leads.map((l) => {
    const a = aggMap.get(l.id)
    const lastFid = lastFlowByLead.get(l.id) ?? null
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      company: l.company,
      role: l.role,
      status: l.status,
      notes: l.notes,
      lastActivityAt: toIso(l.lastActivityAt),
      createdAt: toIsoRequired(l.createdAt),
      updatedAt: toIsoRequired(l.updatedAt),
      emailCount: a?.emailCount ?? 0,
      totalOpens: a?.totalOpens ?? 0,
      totalClicks: a?.totalClicks ?? 0,
      lastSentAt: toIso(a?.lastSent ?? null),
      lastCampaignFlowId: lastFid,
      lastCampaignFlowName: lastFid ? (flowNameById.get(lastFid) ?? null) : null,
    }
  })

  return { leads: overview, total, page, pageSize }
}
