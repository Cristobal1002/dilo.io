import { Resend } from 'resend'
import { createLogger } from '@/lib/logger'

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
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    log.warn({}, 'RESEND_API_KEY or RESEND_FROM_EMAIL not set; skipping digest email')
    return
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const title = data.digestLabel === 'daily' ? 'Resumen diario' : 'Resumen semanal'

  const bodyLines =
    data.lines.length === 0
      ? ['No hubo sesiones completadas en este periodo.', '']
      : [
          `${data.lines.length} sesión(es) completada(s):`,
          '',
          ...data.lines.map((row) => {
            const url = `${base}/dashboard/flows/${row.flowId}/results/${row.sessionId}`
            return [
              `— ${row.flowName} · ${classificationLabel(row.classification)} · score ${row.score ?? '–'}`,
              `  ${row.completedAt}`,
              `  ${url}`,
              '',
            ].join('\n')
          }),
        ]

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: `Dilo <${from}>`,
    to: data.toEmail,
    subject: `${title} · ${data.periodDescription}`,
    text: [
      `${title} de respuestas en Dilo`,
      `Periodo: ${data.periodDescription}`,
      '',
      ...bodyLines,
      '---',
      `Dilo · ${base.replace(/^https?:\/\//, '')}`,
    ].join('\n'),
  })

  if (error) {
    log.error({ error }, 'Resend digest send failed')
    throw new Error(error.message)
  }
}
