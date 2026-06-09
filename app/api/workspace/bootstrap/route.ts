import { currentUser } from '@clerk/nextjs/server'
import { apiSuccess, handleApiError } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'
import { ensureWorkspaceForUser } from '@/lib/workspace'

export async function POST() {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser?.id) throw new UnauthorizedError()

    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

    const { org, orgRole } = await ensureWorkspaceForUser(clerkUser.id, email, name, {
      forceCreate: true,
    })

    return apiSuccess({ organizationId: org.id, orgRole })
  } catch (err) {
    return handleApiError(err, 'POST /api/workspace/bootstrap')
  }
}
