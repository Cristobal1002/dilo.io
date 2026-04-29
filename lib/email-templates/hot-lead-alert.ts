import { buildEmailLayout } from '@/lib/email-templates/email-layout'
import { escapeHtml, scoreFillColor } from '@/lib/email-templates/utils'

type Params = {
  flowName: string
  summary: string | null
  score: number | null
  classification: string | null
  suggestedAction: string | null
  contact: { name?: string; email?: string; phone?: string }
  dashboardUrl: string
}

function classificationLabel(c: string | null): string {
  if (c === 'hot') return '🔥 Hot'
  if (c === 'warm') return '🟡 Warm'
  if (c === 'cold') return '🔵 Cold'
  return '—'
}

export function buildHotLeadAlertEmail(p: Params): string {
  const flowName = escapeHtml(p.flowName)
  const summary = p.summary?.trim()
    ? escapeHtml(p.summary.trim()).replace(/\n/g, '<br/>')
    : '<span style="color:#64748b;">Sin resumen.</span>'

  const contactLines = [
    p.contact.name ? `<div><strong>Nombre:</strong> ${escapeHtml(p.contact.name)}</div>` : '',
    p.contact.email ? `<div><strong>Email:</strong> ${escapeHtml(p.contact.email)}</div>` : '',
    p.contact.phone ? `<div><strong>Teléfono:</strong> ${escapeHtml(p.contact.phone)}</div>` : '',
  ]
    .filter(Boolean)
    .join('')

  const score = scoreFillColor(p.score)

  const bodyHtml = `
<p style="margin:0 0 12px 0;color:#0f172a;font-weight:700;">Hay un lead que conviene revisar ya.</p>
<p style="margin:0 0 14px 0;color:#64748b;">Flow: <strong style="color:#0f172a;">${flowName}</strong></p>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 14px 0;">
  <p style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#0f172a;">Lead</p>
  ${contactLines || '<p style="margin:0;color:#64748b;">Sin datos de contacto.</p>'}
</div>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 14px 0;">
  <p style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#0f172a;">Resumen IA</p>
  <p style="margin:0;color:#0f172a;">${summary}</p>
</div>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 18px 0;">
  <p style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#0f172a;">Scoring</p>
  <p style="margin:0;color:#334155;">Clasificación: <strong>${escapeHtml(classificationLabel(p.classification))}</strong></p>
  <p style="margin:6px 0 0 0;color:#334155;">Score: <strong>${escapeHtml(score.label)}</strong></p>
  <div style="margin-top:8px;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
    <div style="height:10px;width:${score.pct}%;background:${escapeHtml(score.fill)};"></div>
  </div>
  <p style="margin:6px 0 0 0;color:#334155;">Acción sugerida: <strong>${escapeHtml(p.suggestedAction?.trim() || '—')}</strong></p>
</div>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;">
  <tr>
    <td bgcolor="#0f172a" style="border-radius:12px;">
      <a href="${escapeHtml(
        p.dashboardUrl,
      )}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 18px;border-radius:12px;">
        Ver respuesta
      </a>
    </td>
  </tr>
</table>
`.trim()

  return buildEmailLayout({ title: 'Lead destacado', bodyHtml })
}

