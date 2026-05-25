import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors'
import { canManageTeam } from '@/lib/org-role'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/team/members')

export const DELETE = withApiHandler(
  async (_req: NextRequest, { auth, params }) => {
    if (!canManageTeam(auth.orgRole)) {
      throw new ForbiddenError('Solo el owner puede quitar miembros')
    }

    const memberId = params.memberId
    const member = await db.query.users.findFirst({
      where: and(eq(users.id, memberId), eq(users.organizationId, auth.org.id)),
    })

    if (!member) throw new NotFoundError('Miembro')

    if (member.role === 'owner') {
      throw new ValidationError('No puedes quitar al owner del workspace')
    }

    if (member.clerkId === auth.userId) {
      throw new ValidationError('No puedes quitarte a ti mismo; transfiere el ownership primero')
    }

    await db.delete(users).where(eq(users.id, member.id))

    log.info({ orgId: auth.org.id, memberId }, 'Team member removed')

    return apiNoContent()
  },
  { requireAuth: true },
)
