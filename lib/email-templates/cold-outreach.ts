import {
  DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN,
  renderOutreachColdBodyMarkdown,
} from '@/lib/outreach-cold-email-body'
import { escapeHtml } from '@/lib/email-templates/utils'

export type ColdEmailParams = {
  recipientName: string
  senderName: string
  /** Logo del workspace (HTTPS). */
  logoUrl?: string | null
  trackingPixelUrl: string
  /** URL del CTA ya envuelta con /api/track/c/... */
  ctaUrl: string
  /** Markdown del cuerpo; null/vacío → plantilla por defecto. */
  bodyMarkdown?: string | null
  /** Texto del botón CTA. */
  ctaLabel?: string | null
  /** Enlace del pie (HTTPS); null → getdilo.io */
  footerLinkUrl?: string | null
}

function safeFooterHref(url: string | null | undefined): string {
  if (!url?.trim()) return 'https://getdilo.io'
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'https:') return u.toString()
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return u.toString()
    }
  } catch {
    /* ignore */
  }
  return 'https://getdilo.io'
}

function safeLogoSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  try {
    const u = new URL(url.trim())
    if (u.protocol === 'https:') return u.toString()
  } catch {
    /* ignore */
  }
  return null
}

function footerDisplayHost(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, '')
  } catch {
    return 'getdilo.io'
  }
}

/**
 * HTML de cold outreach (estilos inline). Cuerpo en Markdown configurable por org.
 */
export function buildColdEmail({
  recipientName,
  senderName,
  logoUrl,
  trackingPixelUrl,
  ctaUrl,
  bodyMarkdown,
  ctaLabel,
  footerLinkUrl,
}: ColdEmailParams): string {
  const safeSender = escapeHtml(senderName.trim() || 'Equipo')
  const logoSrc = safeLogoSrc(logoUrl)
  const logoSrcEsc = logoSrc ? escapeHtml(logoSrc) : null
  const pixel = escapeHtml(trackingPixelUrl)
  const cta = escapeHtml(ctaUrl)
  const md = bodyMarkdown?.trim() ? bodyMarkdown : DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN
  const bodyHtml = renderOutreachColdBodyMarkdown(md, recipientName)
  const providedLabel = ctaLabel?.trim() ?? ''
  const labelLooksLikeUrl = /^https?:\/\//i.test(providedLabel) || providedLabel.includes('://')
  const btnLabelRaw = (labelLooksLikeUrl ? '' : providedLabel || 'Abrir formulario →').slice(0, 80)
  const btnLabel = escapeHtml(btnLabelRaw)
  const footHref = safeFooterHref(footerLinkUrl ?? null)
  const footHrefEsc = escapeHtml(footHref)
  const footHost = escapeHtml(footerDisplayHost(footHref))

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:0 0 24px 0;">
              ${logoSrcEsc ? `<img src="${logoSrcEsc}" alt="" height="32" style="display:block;height:32px;max-height:32px;width:auto;max-width:180px;margin:0 0 10px 0;border:0;outline:none;text-decoration:none;"/>` : ''}
              <div style="font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">${safeSender}</div>
            </td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.6;color:#334155;">
              ${bodyHtml}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0;">
                <tr>
                  <td bgcolor="#0f172a" style="border-radius:10px;">
                    <a href="${cta}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:10px;letter-spacing:-0.01em;">
                      ${btnLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;">${safeSender}</p>
              <p style="margin:0 0 8px 0;"><a href="${footHrefEsc}" style="color:#6B4DD4;text-decoration:none;">${footHost}</a></p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">Si no quieres recibir más correos, responde con &quot;BAJA&quot; y te damos de baja.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <img src="${pixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`
}
