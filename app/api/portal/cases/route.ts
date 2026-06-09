import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/api-response'
import { isPortalStatusFilter, loadPortalCases } from '@/lib/portal-cases'
import { withPortalHandler } from '@/lib/with-portal-handler'

export const GET = withPortalHandler(async (req: NextRequest, { auth }) => {
  const statusParam = req.nextUrl.searchParams.get('status') ?? 'open'
  const statusFilter = isPortalStatusFilter(statusParam) ? statusParam : 'open'

  const cases = await loadPortalCases({
    organizationId: auth.active.organizationId,
    clientId: auth.active.clientId,
    statusFilter,
  })

  return apiSuccess({ cases, role: auth.active.role })
})
