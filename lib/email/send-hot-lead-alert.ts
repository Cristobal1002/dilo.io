import { Resend } from 'resend'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/hot-lead')

export type HotLeadEmailInput = {
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

export async function sendHotLeadAlertEmail(data: HotLeadEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    log.warn({}, 'RESEND_API_KEY or RESEND_FROM_EMAIL not set; skipping hot lead email')
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

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: `Dilo <${from}>`,
    to: data.toEmail,
    subject: `Lead destacado en "${data.flowName}"`,
    text: [
      'Según tus alertas instantáneas, hay un lead que conviene revisar ya.',
      '',
      `Flow: ${data.flowName}`,
      '',
      'LEAD',
      contactLines || 'Sin datos de contacto',
      '',
      'RESUMEN IA',
      data.summary ?? 'Sin resumen',
      '',
      'SCORING',
      `Clasificación: ${classificationLabel(data.classification)}`,
      `Score: ${data.score ?? '–'}/100`,
      `Acción sugerida: ${data.suggestedAction ?? '–'}`,
      '',
      'Ver respuesta:',
      dashboardUrl,
      '',
      '---',
      `Dilo · ${base.replace(/^https?:\/\//, '')}`,
    ].join('\n'),
  })

  if (error) {
    log.error({ error, sessionId: data.sessionId }, 'Resend hot lead send failed')
    throw new Error(error.message)
  }
}
