import { Resend } from 'resend'
import { resolveServerResendFrom } from '@/lib/email/resend-from'
import { isResendDomainNotVerifiedError } from '@/lib/email/resend-errors'
import { CLIENT_PORTAL_ROLE_LABEL, type ClientPortalRole } from '@/lib/client-portal-roles'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/client-portal-invite')

export class ClientPortalInviteEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientPortalInviteEmailError'
  }
}

export async function sendClientPortalInviteEmail(params: {
  to: string
  clientName: string
  providerName: string
  role: ClientPortalRole
  inviteUrl: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = resolveServerResendFrom()

  if (!apiKey || !from) {
    throw new ClientPortalInviteEmailError(
      'Falta configurar RESEND_API_KEY y RESEND_FROM_EMAIL en el servidor para enviar invitaciones.',
    )
  }

  const roleLabel = CLIENT_PORTAL_ROLE_LABEL[params.role]
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Acceso al portal de soporte — ${params.clientName}`,
    html: `
      <p>Te invitaron al portal de soporte de <strong>${escapeHtml(params.clientName)}</strong>, operado por ${escapeHtml(params.providerName)}.</p>
      <p>Rol: <strong>${escapeHtml(roleLabel)}</strong></p>
      <p><a href="${params.inviteUrl}">Aceptar invitación</a></p>
      <p style="color:#6b7280;font-size:12px;">El enlace caduca en 14 días. Si no esperabas este correo, ignóralo.</p>
    `,
  })

  if (error) {
    log.error({ error, to: params.to, from }, 'Client portal invite email failed')
    const msg = error.message ?? 'Resend rechazó el envío'
    if (isResendDomainNotVerifiedError(msg)) {
      throw new ClientPortalInviteEmailError(
        'Verifica el dominio en resend.com/domains y usa un remitente @tudominio en RESEND_FROM_EMAIL.',
      )
    }
    throw new ClientPortalInviteEmailError(msg)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
