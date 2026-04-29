import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { outreachEmails, outreachLeads } from '@/db/schema'
import { apiCreated } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { sendOutreachColdEmail } from '@/lib/email/send-outreach-cold'
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
  /**
   * Si es true, envía el HTML de cold outreach con Resend (integración del workspace o `RESEND_*` en servidor).
   * El registro en BD se crea antes del envío; si Resend falla, se revierte el insert y el estado del lead.
   */
  sendWithResend: z.boolean().optional(),
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

  const sendWithResend = parsed.data.sendWithResend === true
  if (sendWithResend) {
    const cfg = await resolveResendSendConfig(org.id)
    if (!cfg) {
      throw new ValidationError(
        'Para enviar desde Dilo hace falta Resend en Integraciones (API key y remitente) o las variables RESEND_API_KEY y RESEND_FROM_EMAIL en el servidor.',
      )
    }
  }

  const token = newOutreachTrackingToken()
  const now = new Date()
  const ctaDest = parsed.data.ctaDestinationUrl?.trim()

  const leadSnapshot = {
    status: lead.status,
    lastActivityAt: lead.lastActivityAt,
    updatedAt: lead.updatedAt,
  }

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

  if (!emailRow) {
    throw new ValidationError('No se pudo crear el registro de envío')
  }

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

  if (sendWithResend) {
    try {
      await sendOutreachColdEmail({
        organizationId: org.id,
        senderDisplayName: org.name?.trim() || 'Dilo',
        toEmail: lead.email,
        recipientName: lead.name,
        subject: parsed.data.subject,
        trackingPixelUrl: openPixelUrl,
        trackedCtaUrl,
      })
    } catch (err) {
      await db.delete(outreachEmails).where(eq(outreachEmails.id, emailRow.id))
      await db
        .update(outreachLeads)
        .set({
          status: leadSnapshot.status,
          lastActivityAt: leadSnapshot.lastActivityAt,
          updatedAt: leadSnapshot.updatedAt,
        })
        .where(eq(outreachLeads.id, leadId))
      const msg = err instanceof Error ? err.message : 'Resend rechazó el envío'
      throw new ValidationError(msg)
    }
  }

  return apiCreated({
    email: emailRow,
    trackingToken: token,
    openPixelUrl,
    trackedCtaUrl,
    /** Si no mandaste ctaDestinationUrl, es el ejemplo con getdilo.io. */
    trackedUrlExample: trackedCtaUrl,
    emailSent: sendWithResend,
  })
}, { requireAuth: true })
