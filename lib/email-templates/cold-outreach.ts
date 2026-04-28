export type ColdEmailParams = {
  recipientName: string
  senderName: string
  trackingPixelUrl: string
  /** URL del CTA ya envuelta con /api/track/c/... */
  ctaUrl: string
}

/**
 * HTML de cold outreach (estilos inline). Personaliza el copy antes de enviar.
 */
export function buildColdEmail({
  recipientName,
  senderName,
  trackingPixelUrl,
  ctaUrl,
}: ColdEmailParams): string {
  const safeName = escapeHtml(recipientName.trim() || 'allí')
  const safeSender = escapeHtml(senderName.trim() || 'Equipo Dilo')
  const pixel = escapeHtml(trackingPixelUrl)
  const cta = escapeHtml(ctaUrl)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dilo</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:600px;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding:0 0 24px 0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
              Dilo
            </td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.6;color:#334155;">
              <p style="margin:0 0 16px 0;">Hola ${safeName},</p>
              <p style="margin:0 0 16px 0;">¿Tu proceso de discovery con clientes sigue siendo un PDF o un formulario que nadie llena?</p>
              <p style="margin:0 0 16px 0;">Construí Dilo para reemplazar eso con un flow conversacional con IA que en pocos minutos te da un resumen del cliente, su presupuesto y si vale la pena avanzar.</p>
              <p style="margin:0 0 24px 0;">¿Te muestro cómo funciona en 20 minutos esta semana?</p>
              <p style="margin:0;">
                <a href="${cta}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">
                  Ver demo →
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;">${safeSender}</p>
              <p style="margin:0 0 8px 0;"><a href="https://getdilo.io" style="color:#6B4DD4;text-decoration:none;">getdilo.io</a></p>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
