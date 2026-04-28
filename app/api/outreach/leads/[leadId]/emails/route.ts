import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { apiCreated } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import {
  buildOpenPixelUrl,
  buildTrackedClickUrl,
  newOutreachTrackingToken,
  OUTREACH_MANUAL_PRIORITY_STATUSES,
  type OutreachStatus,
} from '@/lib/outreach'
import { withApiHandler } from '@/lib/with-api-handler'

const BodySchema = z.object({
  subject: z.string().trim().min(1).max(300),
  /** URL final del CTA (https). Se guarda para volver a mostrar el link trackeado. */
  ctaDestinationUrl: z.string().trim().url().max(2000).optional(),
})

export const POST = withApiHandler(async (req: NextRequest, { auth, params }) => {
  const { org } = auth
  const leadId = params.leadId

  const lead = await db.query.outreachLeads.findFirst({
    where: and(
      eq(outreachLeads.id, leadId),
      eq(outreachLeads.organizationId, org.id),
      isNull(outreachLeads.deletedAt),
    ),
  })
  if (!lead) throw new NotFoundError('Lead')

  const body = await req.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Datos inválidos', parsed.error.flatten().fieldErrors)
  }

  const token = newOutreachTrackingToken()
  const now = new Date()
  const ctaDest = parsed.data.ctaDestinationUrl?.trim()

  const [emailRow] = await db
    .insert(outreachEmails)
    .values({
      leadId,
      trackingToken: token,
      subject: parsed.data.subject,
      sentAt: now,
      ctaDestinationUrl: ctaDest ?? null,
    })
    .returning()

  const preserveStatus =
    OUTREACH_MANUAL_PRIORITY_STATUSES.has(lead.status as OutreachStatus)

  await db
    .update(outreachLeads)
    .set({
      ...(preserveStatus ? {} : { status: 'sent' as const }),
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(outreachLeads.id, leadId))

  const openPixelUrl = buildOpenPixelUrl(token)
  const trackedCtaUrl = ctaDest
    ? buildTrackedClickUrl(token, ctaDest)
    : buildTrackedClickUrl(token, 'https://getdilo.io')

  return apiCreated({
    email: emailRow,
    trackingToken: token,
    openPixelUrl,
    trackedCtaUrl,
    /** Si no mandaste ctaDestinationUrl, es el ejemplo con getdilo.io. */
    trackedUrlExample: trackedCtaUrl,
  })
}, { requireAuth: true })
