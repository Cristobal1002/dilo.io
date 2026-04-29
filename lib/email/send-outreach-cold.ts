import { and, eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/db'
import { flows, organizations } from '@/db/schema'
import { buildColdEmail } from '@/lib/email-templates/cold-outreach'
import type { ResolvedResendConfig } from '@/lib/email/org-resend'
import { resolveOutreachColdTemplate } from '@/lib/outreach-cold-template'
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
  resendConfig: ResolvedResendConfig
  /** Permite reusar un cliente por request. */
  resendClient?: Resend
  /** Si se indica, se aplican overrides de plantilla cold definidos en el flow (sobre el workspace). */
  flowId?: string | null
}

/**
 * Envía el HTML de cold outreach con Resend (integración del workspace o `RESEND_*` en servidor).
 */
export async function sendOutreachColdEmail(params: SendOutreachColdEmailParams): Promise<void> {
  const cfg = params.resendConfig

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

  let flowRow: {
    outreachColdEmailBodyMarkdown: string | null
    outreachColdEmailCtaLabel: string | null
  } | null = null
  const fid = params.flowId?.trim()
  if (fid) {
    const [r] = await db
      .select({
        outreachColdEmailBodyMarkdown: flows.outreachColdEmailBodyMarkdown,
        outreachColdEmailCtaLabel: flows.outreachColdEmailCtaLabel,
      })
      .from(flows)
      .where(and(eq(flows.id, fid), eq(flows.organizationId, params.organizationId)))
      .limit(1)
    flowRow = r ?? null
  }

  const tpl = resolveOutreachColdTemplate(orgRow ?? null, flowRow)

  const display = params.senderDisplayName.trim() || 'Equipo'
  const html = buildColdEmail({
    recipientName: params.recipientName,
    senderName: display,
    logoUrl: orgRow?.logoUrl ?? null,
    trackingPixelUrl: params.trackingPixelUrl,
    ctaUrl: params.trackedCtaUrl,
    bodyMarkdown: tpl.bodyMarkdown,
    ctaLabel: tpl.ctaLabel,
    footerLinkUrl: orgRow?.websiteUrl ?? null,
  })

  const resend = params.resendClient ?? new Resend(cfg.apiKey)
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
