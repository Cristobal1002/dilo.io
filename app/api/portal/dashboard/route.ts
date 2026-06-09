import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/api-response'
import { loadPortalDashboardStats } from '@/lib/portal-analytics'
import { withPortalHandler } from '@/lib/with-portal-handler'

export const GET = withPortalHandler(async (req: NextRequest, { auth }) => {
  const clientId = req.nextUrl.searchParams.get('clientId')?.trim() || auth.active.clientId
  const stats = await loadPortalDashboardStats({
    organizationId: auth.active.organizationId,
    clientId,
  })
  return apiSuccess(stats)
})
