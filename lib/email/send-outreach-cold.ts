import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { buildColdEmail } from '@/lib/email-templates/cold-outreach'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/outreach-cold')

export type SendOutreachColdEmailParams = {
  organizationId: string
  /** Firma / cabecera visible en la plantilla (p. ej. nombre del workspace). */
  senderDisplayName: string
  toEmail: string
  recipientName: string
  subject: string
  trackingPixelUrl: string
  trackedCtaUrl: string
}

/**
 * Envía el HTML de cold outreach con Resend (integración del workspace o `RESEND_*` en servidor).
 */
export async function sendOutreachColdEmail(params: SendOutreachColdEmailParams): Promise<void> {
  const cfg = await resolveResendSendConfig(params.organizationId)
  if (!cfg) {
    throw new Error('No hay credenciales Resend para este workspace.')
  }

  const [orgRow] = await db
    .select({
      outreachColdEmailBodyMarkdown: organizations.outreachColdEmailBodyMarkdown,
      outreachColdEmailCtaLabel: organizations.outreachColdEmailCtaLabel,
      websiteUrl: organizations.websiteUrl,
      logoUrl: organizations.logoUrl,
    })
    .from(organizations)
    .where(eq(organizations.id, params.organizationId))
    .limit(1)

  const display = params.senderDisplayName.trim() || 'Equipo'
  const html = buildColdEmail({
    recipientName: params.recipientName,
    senderName: display,
    logoUrl: orgRow?.logoUrl ?? null,
    trackingPixelUrl: params.trackingPixelUrl,
    ctaUrl: params.trackedCtaUrl,
    bodyMarkdown: orgRow?.outreachColdEmailBodyMarkdown ?? null,
    ctaLabel: orgRow?.outreachColdEmailCtaLabel ?? null,
    footerLinkUrl: orgRow?.websiteUrl ?? null,
  })

  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from: `${display} <${cfg.from}>`,
    to: params.toEmail.trim(),
    subject: params.subject.trim(),
    html,
  })

  if (error) {
    log.error({ error, to: params.toEmail }, 'Outreach cold email Resend failed')
    throw new Error(error.message)
  }
}
