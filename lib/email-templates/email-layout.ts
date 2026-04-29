type EmailLayoutParams = {
  /** HTML ya escapado/safe. */
  bodyHtml: string
  /** Texto del título principal (se escapa). */
  title?: string
  /** Logo arriba (HTTPS). */
  logoUrl?: string | null
  /** Enlace del footer (HTTPS). */
  footerLinkUrl?: string | null
  /** Texto del footer (se escapa). */
  footerLabel?: string
}

import { escapeHtml, hostnameForDisplay, safeHttpsUrl } from '@/lib/email-templates/utils'

export function buildEmailLayout(params: EmailLayoutParams): string {
  const title = params.title ? escapeHtml(params.title) : ''
  const logoSrc = safeHttpsUrl(params.logoUrl ?? null)
  const logoSrcEsc = logoSrc ? escapeHtml(logoSrc) : null
  const footHref = safeHttpsUrl(params.footerLinkUrl ?? null) ?? 'https://getdilo.io'
  const footHrefEsc = escapeHtml(footHref)
  const footLabel = escapeHtml(params.footerLabel?.trim() || hostnameForDisplay(footHref))

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title || 'Email'}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:0 0 20px 0;">
              ${logoSrcEsc ? `<img src="${logoSrcEsc}" alt="" height="28" style="display:block;height:28px;max-height:28px;width:auto;max-width:180px;margin:0 0 10px 0;border:0;outline:none;text-decoration:none;"/>` : ''}
              ${title ? `<div style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:1.2;">${title}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.65;color:#334155;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;"><a href="${footHrefEsc}" style="color:#6B4DD4;text-decoration:none;">${footLabel}</a></p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">Enviado por Dilo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

