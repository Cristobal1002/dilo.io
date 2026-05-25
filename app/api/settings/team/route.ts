import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { listPendingInvitations } from '@/lib/team-invitations'
import { countTeamSlotsUsed, getMembersLimit } from '@/lib/team-limits'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/team')

export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { org, orgRole } = auth

    const members = await db.query.users.findMany({
      where: eq(users.organizationId, org.id),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        clerkId: true,
      },
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    })

    const invitations = await listPendingInvitations(org.id)
    const membersLimit = await getMembersLimit(org.plan)
    const slots = await countTeamSlotsUsed(org.id)

    log.debug({ orgId: org.id, count: members.length }, 'Team members fetched')

    return apiSuccess({
      members: members.map(({ clerkId: _c, ...m }) => m),
      invitations,
      limits: {
        members: membersLimit,
        used: slots.total,
        membersCount: slots.members,
        pendingInvites: slots.pendingInvites,
      },
      currentUserRole: orgRole,
    })
  },
  { requireAuth: true },
)
