import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { flows, outreachEmails, outreachLeads } from '@/db/schema'
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
import { Resend } from 'resend'

const BodySchema = z.object({
  subject: z.string().trim().min(1).max(300),
  /** URL final del CTA (https). Se guarda para volver a mostrar el link trackeado. */
  ctaDestinationUrl: z.string().trim().url().max(2000).optional(),
  /** Flow del que tomar overrides de plantilla cold (opcional; debe pertenecer al workspace). */
  flowId: z.string().uuid().optional(),
  /**
   * Si es true, envía el HTML de cold outreach con Resend (integración del workspace o `RESEND_*` en servidor).
   * El registro en BD se crea antes del envío; si Resend falla, se revierte el insert y el estado del lead.
   */
  sendWithResend: z.boolean().optional(),
})

function normalizeCtaDestinationUrl(input: string | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Si pegaron encima y quedó concatenado, tomar la última URL completa.
  const lower = trimmed.toLowerCase()
  const idx = Math.max(lower.lastIndexOf('https://'), lower.lastIndexOf('http://'))
  const candidate = idx > 0 ? trimmed.slice(idx) : trimmed

  // Validación extra: evitar hostnames "pegados" tipo getdilo.iohttps
  try {
    const u = new URL(candidate)
    if (u.hostname.toLowerCase().includes('http')) return null
    return u.toString().slice(0, 2000)
  } catch {
    return null
  }
}

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
  const flowIdIn = parsed.data.flowId?.trim()
  if (flowIdIn) {
    const f = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowIdIn), eq(flows.organizationId, org.id)),
      columns: { id: true },
    })
    if (!f) {
      throw new ValidationError('El flow indicado no existe en este workspace.')
    }
  }

  const resendCfg = sendWithResend ? await resolveResendSendConfig(org.id) : null
  if (sendWithResend) {
    if (!resendCfg) {
      throw new ValidationError(
        'Para enviar desde Dilo hace falta Resend en Integraciones (API key y remitente) o las variables RESEND_API_KEY y RESEND_FROM_EMAIL en el servidor.',
      )
    }
  }

  const token = newOutreachTrackingToken()
  const now = new Date()
  const ctaDest = normalizeCtaDestinationUrl(parsed.data.ctaDestinationUrl)

  const leadSnapshot = {
    status: lead.status,
    lastActivityAt: lead.lastActivityAt,
    updatedAt: lead.updatedAt,
  }

  let emailRow: (typeof outreachEmails.$inferSelect) | undefined
  try {
    ;[emailRow] = await db
      .insert(outreachEmails)
      .values({
        leadId,
        trackingToken: token,
        subject: parsed.data.subject,
        sentAt: now,
        ctaDestinationUrl: ctaDest ?? null,
        flowId: flowIdIn ?? null,
      })
      .returning()
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
    if (code === '23505') {
      throw new ValidationError('No se pudo registrar el envío (duplicado). Inténtalo de nuevo.')
    }
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    throw new ValidationError(`No se pudo registrar el envío: ${msg}`)
  }

  if (!emailRow) {
    throw new ValidationError('No se pudo crear el registro de envío')
  }

  const preserveStatus =
    OUTREACH_MANUAL_PRIORITY_STATUSES.has(lead.status as OutreachStatus)

  try {
    await db
      .update(outreachLeads)
      .set({
        ...(preserveStatus ? {} : { status: 'sent' as const }),
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(outreachLeads.id, leadId))
  } catch (e: unknown) {
    // Si no se pudo actualizar el lead, revertimos el insert para no dejar un "envío" colgando.
    await db.delete(outreachEmails).where(eq(outreachEmails.id, emailRow.id))
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    throw new ValidationError(`No se pudo actualizar el lead: ${msg}`)
  }

  const openPixelUrl = buildOpenPixelUrl(token)
  const trackedCtaUrl = ctaDest
    ? buildTrackedClickUrl(token, ctaDest)
    : buildTrackedClickUrl(token, 'https://getdilo.io')

  if (sendWithResend) {
    try {
      const resendClient = new Resend(resendCfg!.apiKey)
      const resendEmailId = await sendOutreachColdEmail({
        organizationId: org.id,
        senderDisplayName: org.name?.trim() || 'Dilo',
        toEmail: lead.email,
        recipientName: lead.name,
        subject: parsed.data.subject,
        trackingPixelUrl: openPixelUrl,
        trackedCtaUrl,
        resendConfig: resendCfg!,
        resendClient,
        flowId: flowIdIn ?? null,
      })
      const statusAt = new Date()
      const [updatedRow] = await db
        .update(outreachEmails)
        .set({
          resendEmailId: resendEmailId ?? null,
          resendDeliveryStatus: resendEmailId ? 'queued' : null,
          resendDeliveryUpdatedAt: statusAt,
          resendBounceType: null,
          resendBounceMessage: null,
        })
        .where(eq(outreachEmails.id, emailRow.id))
        .returning()
      if (updatedRow) {
        emailRow = updatedRow
      }
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
