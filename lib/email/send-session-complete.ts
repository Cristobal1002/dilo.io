import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { buildSessionCompleteEmail } from '@/lib/email-templates/session-complete'
import { createLogger } from '@/lib/logger'
import { publicAppBaseUrl } from '@/lib/outreach'

const log = createLogger('email/session-complete')

export type SessionCompleteEmailInput = {
  organizationId: string
  toEmail: string
  flowName: string
  flowId: string
  sessionId: string
  summary: string | null
  score: number | null
  classification: string | null
  suggestedAction: string | null
  contact: {
    name?: string
    email?: string
    phone?: string
  }
}

export async function sendSessionCompleteEmail(data: SessionCompleteEmailInput): Promise<void> {
  const cfg = await resolveResendSendConfig(data.organizationId)
  if (!cfg) {
    log.warn(
      { organizationId: data.organizationId },
      'Sin Resend: integración del workspace o RESEND_* en servidor; email de sesión no enviado',
    )
    return
  }

  const base = publicAppBaseUrl()
  const dashboardUrl = `${base}/dashboard/flows/${data.flowId}/results/${data.sessionId}`

  const [orgRow] = await db
    .select({ logoUrl: organizations.logoUrl, websiteUrl: organizations.websiteUrl })
    .from(organizations)
    .where(eq(organizations.id, data.organizationId))
    .limit(1)

  const resend = new Resend(cfg.apiKey)
  const hot = data.classification === 'hot' ? ' 🔥' : ''

  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
    to: data.toEmail,
    subject: `Nueva respuesta en "${data.flowName}"${hot}`,
    html: buildSessionCompleteEmail({
      flowName: data.flowName,
      summary: data.summary,
      score: data.score,
      classification: data.classification,
      suggestedAction: data.suggestedAction,
      contact: data.contact,
      dashboardUrl,
      logoUrl: orgRow?.logoUrl ?? null,
      footerLinkUrl: orgRow?.websiteUrl ?? null,
    }),
  })

  if (error) {
    log.error({ error, sessionId: data.sessionId }, 'Resend send failed')
    throw new Error(error.message)
  }
}
