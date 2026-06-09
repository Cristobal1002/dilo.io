import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/api-response'
import { isPortalOnlyUser } from '@/lib/portal-auth'
import { withPortalHandler } from '@/lib/with-portal-handler'

export const GET = withPortalHandler(async (_req, { auth }) => {
  const logoUrl = auth.active.clientLogoUrl ?? auth.active.organizationLogoUrl
  const canBootstrapWorkspace = await isPortalOnlyUser(auth.clerkUserId)
  return apiSuccess({
    user: {
      email: auth.email,
      name: auth.name,
    },
    activeClientId: auth.active.clientId,
    memberships: auth.memberships.map((m) => ({
      clientId: m.clientId,
      clientName: m.clientName,
      role: m.role,
    })),
    branding: {
      clientName: auth.active.clientName,
      providerName: auth.active.organizationName,
      logoUrl,
    },
    canBootstrapWorkspace,
  })
})

export const POST = withPortalHandler(async (req: NextRequest, { auth }) => {
  const body = (await req.json()) as { clientId?: string }
  const clientId = body.clientId?.trim()
  if (!clientId) {
    return apiSuccess({ activeClientId: auth.active.clientId })
  }
  const match = auth.memberships.find((m) => m.clientId === clientId)
  if (!match) {
    return apiSuccess({ activeClientId: auth.active.clientId })
  }
  return apiSuccess({ activeClientId: match.clientId })
})
