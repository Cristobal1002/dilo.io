import { apiSuccess } from '@/lib/api-response'
import { requireOrgRoles } from '@/lib/org-role'
import { syncSupportCasesForOrganization } from '@/lib/support-case-sync'
import { withApiHandler } from '@/lib/with-api-handler'

export const POST = withApiHandler(async (_req, { auth }) => {
  requireOrgRoles(auth, ['owner', 'admin'])

  const result = await syncSupportCasesForOrganization(auth.org.id)
  return apiSuccess(result)
}, { requireAuth: true })
