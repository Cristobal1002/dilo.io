import { Resend } from 'resend'
import { createLogger } from '@/lib/logger'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { formatUsd, type SupportValueReportPreview } from '@/lib/support-value-report-shared'
import { absoluteSiteOrigin } from '@/lib/site-url'

const log = createLogger('email/support-value-report')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInlineMd(s: string): string {
  const escaped = escapeHtml(s)
  // Bold (**x**)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function markdownToPrettyHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []

  let listMode: 'ul' | null = null
  const flushList = () => {
    if (listMode) {
      out.push('</ul>')
      listMode = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const t = raw.trim()
    if (!t) {
      flushList()
      continue
    }

    if (t === '---' || t === '—' || t === '–––') {
      flushList()
      out.push('<hr style="border:none;border-top:1px solid #E8EAEF;margin:14px 0;"/>')
      continue
    }

    if (t.startsWith('# ')) {
      flushList()
      out.push(
        `<h2 style="margin:16px 0 10px;font-size:16px;line-height:1.3;color:#0F172A;">${renderInlineMd(
          t.slice(2),
        )}</h2>`,
      )
      continue
    }

    if (t.startsWith('## ')) {
      flushList()
      out.push(
        `<h3 style="margin:16px 0 10px;font-size:14px;line-height:1.35;color:#0F172A;">${renderInlineMd(
          t.slice(3),
        )}</h3>`,
      )
      continue
    }

    if (t.startsWith('- ') || t.startsWith('* ')) {
      if (!listMode) {
        listMode = 'ul'
        out.push(
          '<ul style="margin:10px 0 14px;padding-left:18px;color:#334155;font-size:13px;line-height:1.55;">',
        )
      }
      out.push(`<li style="margin:4px 0;">${renderInlineMd(t.slice(2))}</li>`)
      continue
    }

    flushList()
    out.push(
      `<p style="margin:0 0 12px;color:#334155;font-size:13px;line-height:1.55;">${renderInlineMd(
        t,
      )}</p>`,
    )
  }

  flushList()
  return out.join('')
}

function diloPromoFooterHtml(): string {
  const origin = absoluteSiteOrigin()
  const href = escapeHtml(origin)
  return `
    <div style="max-width:680px;margin:14px auto 0;">
      <div style="border:1px solid #E9D5FF;background:linear-gradient(135deg,#FAF5FF 0%,#F8FAFC 100%);border-radius:16px;padding:18px 20px;text-align:center;">
        <div style="font-size:13px;line-height:1.5;color:#6B4DD4;font-weight:800;letter-spacing:-0.01em;">
          ✨ Hecho con <a href="${href}" style="color:#6B4DD4;text-decoration:none;font-weight:900;">Dilo</a>
        </div>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#475569;max-width:520px;margin-left:auto;margin-right:auto;">
          Crea <strong style="color:#334155;">formularios conversacionales</strong>, recibe solicitudes en una bandeja de soporte y genera
          <strong style="color:#334155;">informes de gestión</strong> como este — sin hojas de cálculo ni tickets perdidos.
        </p>
        <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#64748B;">
          📋 Flows en minutos · 🎫 Casos y horas · 📊 Informes para gerencia
        </p>
        <p style="margin:14px 0 0;">
          <a href="${href}" style="display:inline-block;padding:10px 18px;background:#9C77F5;color:#FFFFFF;text-decoration:none;border-radius:10px;font-size:13px;font-weight:700;">
            Conoce Dilo →
          </a>
        </p>
        <p style="margin:10px 0 0;font-size:11px;color:#94A3B8;">
          <a href="${href}" style="color:#94A3B8;text-decoration:underline;">${href.replace(/^https:\/\//, '')}</a>
        </p>
      </div>
    </div>
  `.trim()
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
  organizationId: string
  organizationName: string
  preview: SupportValueReportPreview
  narrativeMarkdown: string
  clientCompany: string | null
}): Promise<{ sent: boolean; error?: string }> {
  const cfg = await resolveResendSendConfig(args.organizationId)
  if (!cfg) {
    return { sent: false, error: 'Resend no configurado en el servidor.' }
  }

  const from = `${args.organizationName} <${cfg.from}>`
  const scope = args.clientCompany ? ` — ${args.clientCompany}` : ''
  const resend = new Resend(cfg.apiKey)
  const kpiCard = (label: string, value: string) =>
    `<td style="padding:0 6px 0 0;width:33.33%;">
      <div style="border:1px solid #E8EAEF;background:#FFFFFF;border-radius:14px;padding:12px 14px;">
        <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;font-weight:700;">${escapeHtml(label)}</div>
        <div style="margin-top:6px;font-size:22px;line-height:1.2;color:#0F172A;font-weight:800;">${escapeHtml(value)}</div>
      </div>
    </td>`

  const html = `
  <div style="background:#F8FAFC;padding:24px 0;">
    <div style="max-width:680px;margin:0 auto;background:#FFFFFF;border:1px solid #E8EAEF;border-radius:18px;overflow:hidden;">
      <div style="padding:20px 22px;border-bottom:1px solid #E8EAEF;background:#FFFFFF;">
        <div style="font-size:12px;color:#64748B;font-weight:600;">${escapeHtml(args.organizationName)}</div>
        <div style="margin-top:6px;font-size:20px;color:#0F172A;font-weight:900;letter-spacing:-0.02em;">
          Informe ejecutivo${escapeHtml(scope)}
        </div>
        <div style="margin-top:6px;font-size:12px;color:#64748B;">
          Periodo: <strong style="color:#334155;">${escapeHtml(args.preview.monthLabel)}</strong>
        </div>
      </div>

      <div style="padding:16px 22px 6px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            ${kpiCard('Horas', `${args.preview.totalHours} h`)}
            ${kpiCard('Casos', String(args.preview.totalCases))}
            ${kpiCard('Valor est.', formatUsd(args.preview.estimatedValueUsd))}
          </tr>
        </table>
      </div>

      <div style="padding:0 22px 8px;">
        ${summaryTableHtml(args.preview)}
      </div>

      <div style="padding:10px 22px 18px;border-top:1px solid #E8EAEF;background:#FFFFFF;">
        ${markdownToPrettyHtml(args.narrativeMarkdown)}
      </div>
    </div>
    ${diloPromoFooterHtml()}
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
