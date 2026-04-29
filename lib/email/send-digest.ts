import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
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

  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from: `Dilo <${cfg.from}>`,
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
