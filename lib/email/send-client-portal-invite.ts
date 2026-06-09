import { Resend } from 'resend'
import { resolveResendSendConfig } from '@/lib/email/org-resend'
import { isResendDomainNotVerifiedError } from '@/lib/email/resend-errors'
import { portalSignInUrl } from '@/lib/auth-redirect'
import { CLIENT_PORTAL_ROLE_LABEL, type ClientPortalRole } from '@/lib/client-portal-roles'
import { publicAppBaseUrl } from '@/lib/outreach'
import { createLogger } from '@/lib/logger'

const log = createLogger('email/client-portal-invite')

const RESEND_NOT_CONFIGURED_MSG =
  'Configura Integraciones → Resend en el workspace (API key y remitente) o RESEND_API_KEY + RESEND_FROM_EMAIL en el servidor.'

export class ClientPortalInviteEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientPortalInviteEmailError'
  }
}

export async function sendClientPortalInviteEmail(params: {
  organizationId: string
  to: string
  clientName: string
  providerName: string
  role: ClientPortalRole
  inviteUrl: string
}): Promise<void> {
  const cfg = await resolveResendSendConfig(params.organizationId)
  if (!cfg) {
    throw new ClientPortalInviteEmailError(RESEND_NOT_CONFIGURED_MSG)
  }

  const roleLabel = CLIENT_PORTAL_ROLE_LABEL[params.role]
  const from = `${params.providerName} <${cfg.from}>`
  const resend = new Resend(cfg.apiKey)
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
    log.error({ error, to: params.to, from, source: cfg.source }, 'Client portal invite email failed')
    const msg = error.message ?? 'Resend rechazó el envío'
    if (isResendDomainNotVerifiedError(msg)) {
      throw new ClientPortalInviteEmailError(
        'Verifica el dominio en resend.com/domains y usa un remitente @tudominio en Integraciones → Resend.',
      )
    }
    throw new ClientPortalInviteEmailError(msg)
  }
}

export async function sendClientPortalAccessEmail(params: {
  organizationId: string
  to: string
  clientName: string
  providerName: string
  role: ClientPortalRole
  portalUrl: string
}): Promise<void> {
  const cfg = await resolveResendSendConfig(params.organizationId)
  if (!cfg) {
    throw new ClientPortalInviteEmailError(RESEND_NOT_CONFIGURED_MSG)
  }

  const roleLabel = CLIENT_PORTAL_ROLE_LABEL[params.role]
  const signInUrl = `${publicAppBaseUrl()}${portalSignInUrl('/portal')}`
  const from = `${params.providerName} <${cfg.from}>`
  const resend = new Resend(cfg.apiKey)
  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Acceso al portal de soporte — ${params.clientName}`,
    html: `
      <p>Tienes acceso al portal de soporte de <strong>${escapeHtml(params.clientName)}</strong>, operado por ${escapeHtml(params.providerName)}.</p>
      <p>Rol: <strong>${escapeHtml(roleLabel)}</strong></p>
      <p><a href="${signInUrl}">Entrar al portal</a></p>
      <p style="color:#6b7280;font-size:12px;">Usa este correo (${escapeHtml(params.to)}) para iniciar sesión o crear tu cuenta. Si no esperabas este mensaje, ignóralo.</p>
    `,
  })

  if (error) {
    log.error({ error, to: params.to, from, source: cfg.source }, 'Client portal access email failed')
    const msg = error.message ?? 'Resend rechazó el envío'
    if (isResendDomainNotVerifiedError(msg)) {
      throw new ClientPortalInviteEmailError(
        'Verifica el dominio en resend.com/domains y usa un remitente @tudominio en Integraciones → Resend.',
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
