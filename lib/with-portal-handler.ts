import { NextRequest, NextResponse } from 'next/server'
import { getPortalAuthContext } from '@/lib/portal-auth'
import { handleApiError } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const log = createLogger('portal-handler')

type PortalHandlerContext = {
  auth: Awaited<ReturnType<typeof getPortalAuthContext>>
  params: Record<string, string>
}

export function withPortalHandler(
  handler: (req: NextRequest, ctx: PortalHandlerContext) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    segmentCtx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const start = Date.now()
    const params = await segmentCtx.params
    const clientId =
      req.nextUrl.searchParams.get('clientId') ??
      req.headers.get('x-portal-client-id') ??
      undefined

    try {
      const auth = await getPortalAuthContext(clientId)
      const response = await handler(req, { auth, params })
      log.debug(
        { url: req.url, status: response.status, ms: Date.now() - start },
        'Portal request completed',
      )
      return response
    } catch (err) {
      return handleApiError(err, `${req.method} ${req.url}`)
    }
  }
}
