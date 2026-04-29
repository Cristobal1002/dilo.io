import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { createLogger } from '@/lib/logger'

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

function classificationLabel(c: string | null): string {
  if (c === 'hot') return '🔥 Hot'
  if (c === 'warm') return '🟡 Warm'
  if (c === 'cold') return '🔵 Cold'
  return '–'
}

function scoreBar(score: number | null): string {
  if (score == null) return '–'
  const n = Math.max(0, Math.min(100, Math.round(score)))
  const filled = Math.round(n / 10)
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${n}/100`
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

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const dashboardUrl = `${base}/dashboard/flows/${data.flowId}/results/${data.sessionId}`

  const contactLines = [
    data.contact.name ? `Nombre: ${data.contact.name}` : '',
    data.contact.email ? `Email: ${data.contact.email}` : '',
    data.contact.phone ? `Teléfono: ${data.contact.phone}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const resend = new Resend(cfg.apiKey)
  const hot = data.classification === 'hot' ? ' 🔥' : ''

  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
    to: data.toEmail,
    subject: `Nueva respuesta en "${data.flowName}"${hot}`,
    text: [
      `Nueva respuesta recibida en: ${data.flowName}`,
      '',
      'LEAD',
      contactLines || 'Sin datos de contacto',
      '',
      'RESUMEN IA',
      data.summary ?? 'Sin resumen',
      '',
      'SCORING',
      `Clasificación: ${classificationLabel(data.classification)}`,
      `Score: ${scoreBar(data.score)}`,
      `Acción sugerida: ${data.suggestedAction ?? '–'}`,
      '',
      'Ver respuesta completa:',
      dashboardUrl,
      '',
      '---',
      `Dilo · ${base.replace(/^https?:\/\//, '')}`,
    ].join('\n'),
  })

  if (error) {
    log.error({ error, sessionId: data.sessionId }, 'Resend send failed')
    throw new Error(error.message)
  }
}
