import { NextRequest } from 'next/server'
import { revokeOrganizationInvitation } from '@/lib/team-invitations'
import { ForbiddenError } from '@/lib/errors'
import { canManageTeam } from '@/lib/org-role'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/team/invitations')

export const DELETE = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    if (!canManageTeam(auth.orgRole)) {
      throw new ForbiddenError('Solo el owner puede revocar invitaciones')
    }

    await revokeOrganizationInvitation(auth.org.id, params.invitationId)

    log.info({ orgId: auth.org.id, invitationId: params.invitationId }, 'Invitation revoked')

    return apiNoContent()
  },
  { requireAuth: true },
)
