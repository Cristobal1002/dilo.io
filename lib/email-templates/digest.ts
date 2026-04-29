import { buildEmailLayout } from '@/lib/email-templates/email-layout'
import { escapeHtml } from '@/lib/email-templates/utils'

export type DigestLine = {
  flowName: string
  completedAt: string
  classification: string | null
  score: number | null
  url: string
}

function classificationLabel(c: string | null): string {
  if (c === 'hot') return 'Hot'
  if (c === 'warm') return 'Warm'
  if (c === 'cold') return 'Cold'
  return '—'
}

export function buildDigestEmail(params: {
  title: string
  periodDescription: string
  lines: DigestLine[]
}): string {
  const bodyHtml =
    params.lines.length === 0
      ? `<p style="margin:0;color:#64748b;">No hubo sesiones completadas en este periodo.</p>`
      : `
<p style="margin:0 0 8px 0;color:#64748b;">Periodo: <strong style="color:#0f172a;">${escapeHtml(
          params.periodDescription,
        )}</strong></p>
<div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <tr style="background:#f8fafc;">
      <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;">Flow</th>
      <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;">Estado</th>
      <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;">Score</th>
    </tr>
    ${params.lines
      .map((l) => {
        const score = l.score == null ? '—' : `${Math.max(0, Math.min(100, Math.round(l.score)))}/100`
        return `
    <tr>
      <td style="padding:12px;border-top:1px solid #e2e8f0;">
        <a href="${escapeHtml(l.url)}" style="color:#0f172a;text-decoration:none;font-weight:700;">${escapeHtml(
          l.flowName,
        )}</a>
        <div style="margin-top:4px;color:#94a3b8;font-size:12px;">${escapeHtml(l.completedAt)}</div>
      </td>
      <td style="padding:12px;border-top:1px solid #e2e8f0;color:#334155;font-weight:700;">${escapeHtml(
        classificationLabel(l.classification),
      )}</td>
      <td style="padding:12px;border-top:1px solid #e2e8f0;color:#334155;font-weight:700;">${escapeHtml(score)}</td>
    </tr>`
      })
      .join('')}
  </table>
</div>
`.trim()

  return buildEmailLayout({
    title: params.title,
    bodyHtml,
  })
}

