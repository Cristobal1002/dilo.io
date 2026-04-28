import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { getAuthContext } from '@/lib/auth'
import OutreachTable, { type OutreachLeadOverview } from './outreach-table'

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

export default async function OutreachPage() {
  const { org } = await getAuthContext()

  const leads = await db.query.outreachLeads.findMany({
    where: and(eq(outreachLeads.organizationId, org.id), isNull(outreachLeads.deletedAt)),
    orderBy: [desc(outreachLeads.lastActivityAt), desc(outreachLeads.createdAt)],
    limit: 80,
  })

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

  const initialLeads: OutreachLeadOverview[] = leads.map((l) => {
    const a = aggMap.get(l.id)
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
    }
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Outreach</p>
      <h1 className="mt-1 text-2xl font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Cold email & seguimiento</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#64748B] dark:text-[#94A3B8]">
        Leads por organización, registro de envíos con pixel de apertura y redirección de clics. Los enlaces públicos usan
        un token opaco (no el UUID interno).
      </p>
      <div className="mt-8">
        <OutreachTable initialLeads={initialLeads} />
      </div>
    </div>
  )
}
