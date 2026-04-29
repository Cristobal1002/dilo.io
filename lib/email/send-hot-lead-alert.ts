import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { buildHotLeadAlertEmail } from '@/lib/email-templates/hot-lead-alert'
import { createLogger } from '@/lib/logger'
import { publicAppBaseUrl } from '@/lib/outreach'

const log = createLogger('email/hot-lead')

export type HotLeadEmailInput = {
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

export async function sendHotLeadAlertEmail(data: HotLeadEmailInput): Promise<void> {
  const cfg = await resolveResendSendConfig(data.organizationId)
  if (!cfg) {
    log.warn(
      { organizationId: data.organizationId },
      'Sin Resend: configura Integraciones → Resend en el workspace o RESEND_API_KEY + RESEND_FROM_EMAIL en el servidor',
    )
    return
  }

  const base = publicAppBaseUrl()
  const dashboardUrl = `${base}/dashboard/flows/${data.flowId}/results/${data.sessionId}`

  const resend = new Resend(cfg.apiKey)

  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
    to: data.toEmail,
    subject: `Lead destacado en "${data.flowName}"`,
    html: buildHotLeadAlertEmail({
      flowName: data.flowName,
      summary: data.summary,
      score: data.score,
      classification: data.classification,
      suggestedAction: data.suggestedAction,
      contact: data.contact,
      dashboardUrl,
    }),
  })

  if (error) {
    log.error({ error, sessionId: data.sessionId }, 'Resend hot lead send failed')
    throw new Error(error.message)
  }
}
