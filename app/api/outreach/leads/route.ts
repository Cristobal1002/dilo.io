import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { apiCreated, apiSuccess } from '@/lib/api-response'
import { ConflictError, ValidationError } from '@/lib/errors'
import { normalizeLeadEmailKey, OUTREACH_FILTER_STATUSES } from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'

const CreateBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(200).optional().nullable(),
  role: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
})

const ListQuery = z.object({
  status: z.enum(OUTREACH_FILTER_STATUSES).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(80),
})

export const GET = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org } = auth
  const q = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = ListQuery.safeParse(q)
  if (!parsed.success) {
    throw new ValidationError('Parámetros inválidos', parsed.error.flatten().fieldErrors)
  }
  const { status, limit } = parsed.data

  const whereBase = and(eq(outreachLeads.organizationId, org.id), isNull(outreachLeads.deletedAt))
  const where =
    status === 'all' ? whereBase : and(whereBase, eq(outreachLeads.status, status))

  const leads = await db.query.outreachLeads.findMany({
    where,
    orderBy: [desc(outreachLeads.lastActivityAt), desc(outreachLeads.createdAt)],
    limit,
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

  const aggByLead = new Map(agg.map((r) => [r.leadId, r]))

  const data = leads.map((l) => {
    const a = aggByLead.get(l.id)
    return {
      ...l,
      emailCount: a?.emailCount ?? 0,
      totalOpens: a?.totalOpens ?? 0,
      totalClicks: a?.totalClicks ?? 0,
      lastSentAt: a?.lastSent ?? null,
    }
  })

  return apiSuccess({ leads: data })
}, { requireAuth: true })

export const POST = withApiHandler(async (req: NextRequest, { auth }) => {
  const { org } = auth
  const body = await req.json()
  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const emailKey = normalizeLeadEmailKey(parsed.data.email)
  const now = new Date()

  try {
    const [row] = await db
      .insert(outreachLeads)
      .values({
        organizationId: org.id,
        name: parsed.data.name,
        email: parsed.data.email.trim(),
        emailKey,
        company: parsed.data.company?.trim() || null,
        role: parsed.data.role?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        lastActivityAt: now,
        updatedAt: now,
      })
      .returning()
    return apiCreated({ lead: row })
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === '23505') {
      throw new ConflictError('Ya existe un lead activo con ese email')
    }
    throw e
  }
}, { requireAuth: true })
