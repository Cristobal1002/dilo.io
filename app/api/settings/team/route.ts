import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const log = createLogger('settings/team')

export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { org } = auth

    const members = await db.query.users.findMany({
      where: eq(users.organizationId, org.id),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    })

    log.debug({ orgId: org.id, count: members.length }, 'Team members fetched')

    return apiSuccess({ members })
  },
  { requireAuth: true },
)
