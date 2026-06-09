import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { isResendDomainNotVerifiedError } from '@/lib/email/resend-errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/portal-code')

const RESEND_NOT_CONFIGURED_MSG =
  'Configura Integraciones → Resend en el workspace (API key y remitente) o RESEND_API_KEY + RESEND_FROM_EMAIL en el servidor.'

export class PortalLoginCodeEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PortalLoginCodeEmailError'
  }
}

export async function sendPortalLoginCodeEmail(params: {
  organizationId: string
  to: string
  code: string
  entrarUrl: string
  clientName: string
  providerName: string
}): Promise<void> {
  const cfg = await resolveResendSendConfig(params.organizationId)
  if (!cfg) {
    throw new PortalLoginCodeEmailError(RESEND_NOT_CONFIGURED_MSG)
  }

  const from = `${params.providerName} <${cfg.from}>`
  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Tu código de acceso — ${params.clientName}`,
    html: `
      <p>Tu código para entrar al portal de soporte de <strong>${escapeHtml(params.clientName)}</strong>:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;">${escapeHtml(params.code)}</p>
      <p><a href="${params.entrarUrl}">Abrir portal e ingresar código</a></p>
      <p style="color:#6b7280;font-size:12px;">El código caduca en 15 minutos. Si no esperabas este correo, ignóralo.</p>
    `,
  })

  if (error) {
    log.error({ error, to: params.to, from, source: cfg.source }, 'Portal login code email failed')
    const msg = error.message ?? 'Resend rechazó el envío'
    if (isResendDomainNotVerifiedError(msg)) {
      throw new PortalLoginCodeEmailError(
        'Verifica el dominio en resend.com/domains y usa un remitente @tudominio en Integraciones → Resend.',
      )
    }
    throw new PortalLoginCodeEmailError(msg)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
