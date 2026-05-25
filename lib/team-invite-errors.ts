import { isResendTestRecipientOnlyError } from '@/lib/email/resend-errors'

/** El correo no se envió; la invitación en BD sigue válida (modo desarrollo + Resend de prueba). */
export class TeamInviteLinkOnlyError extends Error {
  readonly inviteUrl: string
  readonly invitation: { id: string; email: string; role: string }

  constructor(
    message: string,
    inviteUrl: string,
    invitation: { id: string; email: string; role: string },
  ) {
    super(message)
    this.name = 'TeamInviteLinkOnlyError'
    this.inviteUrl = inviteUrl
    this.invitation = invitation
  }
}

export function toTeamInviteLinkOnlyIfDevTestMode(
  err: unknown,
  inviteUrl: string,
  invitation: { id: string; email: string; role: string },
): TeamInviteLinkOnlyError | null {
  if (process.env.NODE_ENV !== 'development') return null
  const msg = err instanceof Error ? err.message : ''
  if (!isResendTestRecipientOnlyError(msg)) return null
  return new TeamInviteLinkOnlyError(
    'Resend en modo prueba solo envía a tu propio correo (el de tu cuenta Resend). Copia el enlace y compártelo con la persona invitada.',
    inviteUrl,
    invitation,
  )
}
