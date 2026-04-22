import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'

/** Lightweight endpoint used by the sidebar to show name, email, and plan. */
export const GET = withApiHandler(
  async (_req: NextRequest, { auth }) => {
    const { userId, org } = auth

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
      columns: { name: true, email: true },
    })

    return apiSuccess({
      name: user?.name ?? null,
      email: user?.email ?? '',
      plan: org.plan,
    })
  },
  { requireAuth: true },
)
