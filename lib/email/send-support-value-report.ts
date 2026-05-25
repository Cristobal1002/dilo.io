import { Resend } from 'resend'
import { createLogger } from '@/lib/logger'
import { resolveServerResendFrom } from '@/lib/email/resend-from'
import { formatUsd, type SupportValueReportPreview } from '@/lib/support-value-report-shared'

const log = createLogger('email/support-value-report')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToSimpleHtml(md: string): string {
  const blocks = md.split(/\n\n+/).filter(Boolean)
  return blocks
    .map((block) => {
      const trimmed = block.trim()
      if (trimmed.startsWith('## ')) {
        return `<h2 style="margin:16px 0 8px;font-size:16px;color:#111827;">${escapeHtml(trimmed.slice(3))}</h2>`
      }
      if (trimmed.startsWith('# ')) {
        return `<h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${escapeHtml(trimmed.slice(2))}</h1>`
      }
      const lines = trimmed.split('\n').map((l) => escapeHtml(l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')))
      return `<p style="margin:0 0 12px;line-height:1.5;color:#374151;">${lines.join('<br/>')}</p>`
    })
    .join('')
}

function summaryTableHtml(preview: SupportValueReportPreview): string {
  const rows = preview.companies
    .map(
      (c) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #E8EAEF;">${escapeHtml(c.clientCompany)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #E8EAEF;text-align:right;">${c.totalHours} h</td>` +
        `<td style="padding:8px;border-bottom:1px solid #E8EAEF;text-align:right;">${c.caseCount}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #E8EAEF;text-align:right;">${formatUsd(c.estimatedValueUsd)}</td></tr>`,
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;">
    <thead><tr style="background:#F8F9FB;">
      <th style="padding:8px;text-align:left;">Empresa</th>
      <th style="padding:8px;text-align:right;">Horas</th>
      <th style="padding:8px;text-align:right;">Casos</th>
      <th style="padding:8px;text-align:right;">Valor est.</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

export async function sendSupportValueReportEmail(args: {
  to: string
  organizationName: string
  preview: SupportValueReportPreview
  narrativeMarkdown: string
  clientCompany: string | null
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = resolveServerResendFrom()
  if (!apiKey || !from) {
    return { sent: false, error: 'Resend no configurado en el servidor.' }
  }

  const scope = args.clientCompany ? ` — ${args.clientCompany}` : ''
  const resend = new Resend(apiKey)
  const html = `
    <p style="font-size:14px;color:#64748B;">${escapeHtml(args.organizationName)}</p>
    <h1 style="margin:8px 0 16px;font-size:22px;color:#111827;">Informe de valor${escapeHtml(scope)}</h1>
    <p style="margin:0 0 8px;color:#64748B;font-size:13px;">Periodo: ${escapeHtml(args.preview.monthLabel)} · ${args.preview.totalHours} h · ${formatUsd(args.preview.estimatedValueUsd)}</p>
    ${summaryTableHtml(args.preview)}
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E8EAEF;">
      ${markdownToSimpleHtml(args.narrativeMarkdown)}
    </div>
  `.trim()

  try {
    const { error } = await resend.emails.send({
      from,
      to: args.to,
      subject: `[${args.organizationName}] Informe de valor ${args.preview.monthLabel}${scope}`,
      html,
    })
    if (error) {
      log.warn({ err: error, to: args.to }, 'Resend value report email failed')
      return { sent: false, error: error.message }
    }
    return { sent: true }
  } catch (e) {
    log.error({ err: e, to: args.to }, 'Resend value report email exception')
    return { sent: false, error: e instanceof Error ? e.message : 'Error al enviar correo' }
  }
}
