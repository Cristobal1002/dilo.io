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
  logoUrl?: string | null
  footerLinkUrl?: string | null
}

function classificationBadge(c: string | null): { label: string; bg: string; fg: string } {
  if (c === 'hot') return { label: '🔥 Hot', bg: '#FEF2F2', fg: '#991B1B' }
  if (c === 'warm') return { label: '🟡 Warm', bg: '#FFFBEB', fg: '#92400E' }
  if (c === 'cold') return { label: '🔵 Cold', bg: '#EFF6FF', fg: '#1D4ED8' }
  return { label: '—', bg: '#F1F5F9', fg: '#334155' }
}

export function buildSessionCompleteEmail(p: Params): string {
  const badge = classificationBadge(p.classification)
  const score = scoreFillColor(p.score)
  const flowName = escapeHtml(p.flowName)

  const contactRows = [
    p.contact.name ? ['Nombre', escapeHtml(p.contact.name)] : null,
    p.contact.email ? ['Email', escapeHtml(p.contact.email)] : null,
    p.contact.phone ? ['Teléfono', escapeHtml(p.contact.phone)] : null,
  ].filter(Boolean) as Array<[string, string]>

  const contactHtml =
    contactRows.length === 0
      ? `<p style="margin:0;color:#64748b;">Sin datos de contacto.</p>`
      : `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;">
          ${contactRows
            .map(
              ([k, v]) => `
            <tr>
              <td style="width:110px;color:#64748b;font-size:12px;">${escapeHtml(k)}</td>
              <td style="color:#0f172a;font-size:13px;font-weight:600;">${v}</td>
            </tr>`,
            )
            .join('')}
        </table>`

  const summaryHtml = p.summary?.trim()
    ? `<p style="margin:0;color:#0f172a;">${escapeHtml(p.summary.trim()).replace(/\n/g, '<br/>')}</p>`
    : `<p style="margin:0;color:#64748b;">Sin resumen.</p>`

  const actionHtml = p.suggestedAction?.trim()
    ? `<p style="margin:0;color:#0f172a;">${escapeHtml(p.suggestedAction.trim())}</p>`
    : `<p style="margin:0;color:#64748b;">—</p>`

  const scoreLabel = score.label
  const scorePct = score.pct

  const bodyHtml = `
<p style="margin:0 0 12px 0;color:#64748b;font-size:13px;">Nueva respuesta recibida en:</p>
<p style="margin:0 0 18px 0;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">${flowName}</p>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 14px 0;background:#ffffff;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px 0;">
    <span style="display:inline-block;background:${badge.bg};color:${badge.fg};font-weight:800;font-size:12px;padding:6px 10px;border-radius:999px;">${escapeHtml(
      badge.label,
    )}</span>
    <span style="color:#64748b;font-size:12px;font-weight:700;">Score: ${escapeHtml(scoreLabel)}</span>
  </div>
  <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
    <div style="height:10px;width:${scorePct}%;background:${escapeHtml(score.fill)};"></div>
  </div>
</div>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 14px 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:13px;font-weight:800;color:#0f172a;">Lead</p>
  ${contactHtml}
</div>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 14px 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:13px;font-weight:800;color:#0f172a;">Resumen IA</p>
  ${summaryHtml}
</div>

<div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 18px 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:13px;font-weight:800;color:#0f172a;">Acción sugerida</p>
  ${actionHtml}
</div>

<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;">
  <tr>
    <td bgcolor="#0f172a" style="border-radius:12px;">
      <a href="${escapeHtml(
        p.dashboardUrl,
      )}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 18px;border-radius:12px;letter-spacing:-0.01em;">
        Ver respuesta completa
      </a>
    </td>
  </tr>
</table>
`.trim()

  return buildEmailLayout({
    title: 'Nueva respuesta',
    logoUrl: p.logoUrl ?? null,
    footerLinkUrl: p.footerLinkUrl ?? null,
    bodyHtml,
  })
}

