import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { buildDigestEmail, type DigestLine } from '@/lib/email-templates/digest'
import { createLogger } from '@/lib/logger'
import { publicAppBaseUrl } from '@/lib/outreach'

const log = createLogger('email/digest')

export type DigestSessionLine = {
  flowName: string
  sessionId: string
  flowId: string
  completedAt: string
  classification: string | null
  score: number | null
}

export type DigestEmailInput = {
  organizationId: string
  toEmail: string
  digestLabel: 'daily' | 'weekly'
  lines: DigestSessionLine[]
  periodDescription: string
}

function classificationLabel(c: string | null): string {
  if (c === 'hot') return 'Hot'
  if (c === 'warm') return 'Warm'
  if (c === 'cold') return 'Cold'
  return '–'
}

export async function sendSessionsDigestEmail(data: DigestEmailInput): Promise<void> {
  const cfg = await resolveResendSendConfig(data.organizationId)
  if (!cfg) {
    log.warn(
      { organizationId: data.organizationId },
      'Sin Resend: integración del workspace o RESEND_* en servidor; digest no enviado',
    )
    return
  }

  const base = publicAppBaseUrl()
  const title = data.digestLabel === 'daily' ? 'Resumen diario' : 'Resumen semanal'
  const lines: DigestLine[] = data.lines.map((row) => ({
    flowName: row.flowName,
    completedAt: row.completedAt,
    classification: row.classification,
    score: row.score,
    url: `${base}/dashboard/flows/${row.flowId}/results/${row.sessionId}`,
  }))

  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
    to: data.toEmail,
    subject: `${title} · ${data.periodDescription}`,
    html: buildDigestEmail({ title, periodDescription: data.periodDescription, lines }),
  })

  if (error) {
    log.error({ error }, 'Resend digest send failed')
    throw new Error(error.message)
  }
}
