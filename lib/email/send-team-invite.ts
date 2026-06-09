import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { isResendDomainNotVerifiedError } from '@/lib/email/resend-errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/team-invite')

const RESEND_NOT_CONFIGURED_MSG =
  'Configura Integraciones → Resend en el workspace (API key y remitente) o RESEND_API_KEY + RESEND_FROM_EMAIL en el servidor.'

export class TeamInviteEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeamInviteEmailError'
  }
}

export async function sendTeamInviteEmail(params: {
  organizationId: string
  to: string
  organizationName: string
  inviteUrl: string
}): Promise<void> {
  const cfg = await resolveResendSendConfig(params.organizationId)
  if (!cfg) {
    throw new TeamInviteEmailError(RESEND_NOT_CONFIGURED_MSG)
  }

  const from = `${params.organizationName} <${cfg.from}>`
  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Te invitaron a ${params.organizationName} en Dilo`,
    html: `
      <p>Te invitaron a unirte al workspace <strong>${escapeHtml(params.organizationName)}</strong> en Dilo.</p>
      <p><a href="${params.inviteUrl}">Aceptar invitación</a></p>
      <p style="color:#6b7280;font-size:12px;">El enlace caduca en 14 días. Si no esperabas este correo, ignóralo.</p>
    `,
  })

  if (error) {
    log.error({ error, to: params.to, from, source: cfg.source }, 'Team invite email failed')
    const msg = error.message ?? 'Resend rechazó el envío'

    if (isResendDomainNotVerifiedError(msg)) {
      throw new TeamInviteEmailError(
        'Verifica el dominio en resend.com/domains y usa un remitente @tudominio en Integraciones → Resend.',
      )
    }

    throw new TeamInviteEmailError(msg)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
