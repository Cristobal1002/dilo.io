import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createOrganizationInvitation, TeamInviteLinkOnlyError } from '@/lib/team-invitations'
import { TeamInviteEmailError } from '@/lib/email/send-team-invite'
import { ValidationError, ConflictError, ForbiddenError } from '@/lib/errors'
import { canManageTeam } from '@/lib/org-role'
import { countTeamSlotsUsed, getMembersLimit, isWithinMembersLimit } from '@/lib/team-limits'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { getAuthUserInOrg } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/team/invite')

const bodySchema = z.object({
  email: z.string().email('Correo inválido'),
  role: z.enum(['admin', 'member']),
})

export const POST = withApiHandler(
  async (req: NextRequest, { auth }) => {
    if (!canManageTeam(auth.orgRole)) {
      throw new ForbiddenError('Solo el owner puede invitar miembros')
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten())
    }

    const { email, role } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    const membersLimit = await getMembersLimit(auth.org.plan)
    const slots = await countTeamSlotsUsed(auth.org.id)

    if (!isWithinMembersLimit(slots.total, membersLimit)) {
      throw new ConflictError(
        membersLimit === 1
          ? 'Tu plan solo permite 1 miembro. Actualiza el plan para invitar al equipo.'
          : `Has alcanzado el límite de ${membersLimit} miembros (incluye invitaciones pendientes).`,
      )
    }

    const inviter = await getAuthUserInOrg(auth)

    try {
      const invitation = await createOrganizationInvitation(
        auth.org.id,
        inviter?.id ?? null,
        normalizedEmail,
        role,
      )

      log.info({ orgId: auth.org.id, email: normalizedEmail, role }, 'Team invitation sent')

      return apiCreated({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role,
        },
        emailSent: true,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'MEMBER_EXISTS') {
        throw new ConflictError('Esa persona ya es miembro del workspace.')
      }
      if (err instanceof TeamInviteLinkOnlyError) {
        return apiCreated({
          invitation: err.invitation,
          emailSent: false,
          inviteUrl: err.inviteUrl,
          message: err.message,
        })
      }
      if (err instanceof TeamInviteEmailError) {
        throw new ValidationError(err.message)
      }
      throw err
    }
  },
  { requireAuth: true },
)
