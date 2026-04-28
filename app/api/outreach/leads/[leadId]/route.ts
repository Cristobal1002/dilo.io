import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { apiNoContent, apiSuccess } from '@/lib/api-response'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  archivedLeadEmailKey,
  isOutreachStatus,
  normalizeLeadEmailKey,
} from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'

const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    company: z.string().trim().max(200).optional().nullable(),
    role: z.string().trim().max(200).optional().nullable(),
    status: z
      .string()
      .optional()
      .refine((s) => s === undefined || isOutreachStatus(s), 'Estado inválido'),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Sin cambios' })

async function getLeadForOrg(leadId: string, organizationId: string) {
  return db.query.outreachLeads.findFirst({
    where: and(
      eq(outreachLeads.id, leadId),
      eq(outreachLeads.organizationId, organizationId),
      isNull(outreachLeads.deletedAt),
    ),
  })
}

export const GET = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const leadId = params.leadId
  const lead = await getLeadForOrg(leadId, org.id)
  if (!lead) throw new NotFoundError('Lead')

  const emails = await db.query.outreachEmails.findMany({
    where: eq(outreachEmails.leadId, leadId),
    orderBy: [desc(outreachEmails.sentAt)],
  })

  return apiSuccess({ lead, emails })
}, { requireAuth: true })

export const PATCH = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const leadId = params.leadId
  const existing = await getLeadForOrg(leadId, org.id)
  if (!existing) throw new NotFoundError('Lead')

  const body = await req.json()
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const now = new Date()
  const patch: Partial<typeof outreachLeads.$inferInsert> = { updatedAt: now, lastActivityAt: now }

  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.company !== undefined) patch.company = parsed.data.company?.trim() || null
  if (parsed.data.role !== undefined) patch.role = parsed.data.role?.trim() || null
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes?.trim() || null
  if (parsed.data.status !== undefined) {
    if (!isOutreachStatus(parsed.data.status)) {
      throw new ValidationError('Estado inválido')
    }
    patch.status = parsed.data.status
  }
  if (parsed.data.email !== undefined) {
    patch.email = parsed.data.email.trim()
    patch.emailKey = normalizeLeadEmailKey(parsed.data.email)
  }

  try {
    const [row] = await db.update(outreachLeads).set(patch).where(eq(outreachLeads.id, leadId)).returning()
    return apiSuccess({ lead: row })
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === '23505') {
      throw new ConflictError('Ya existe un lead activo con ese email')
    }
    throw e
  }
}, { requireAuth: true })

export const DELETE = withApiHandler(async (_req: NextRequest, { auth, params }) => {
  const { org } = auth
  const leadId = params.leadId
  const existing = await getLeadForOrg(leadId, org.id)
  if (!existing) throw new NotFoundError('Lead')

  const now = new Date()
  await db
    .update(outreachLeads)
    .set({
      deletedAt: now,
      emailKey: archivedLeadEmailKey(leadId),
      updatedAt: now,
    })
    .where(eq(outreachLeads.id, leadId))

  return apiNoContent()
}, { requireAuth: true })
