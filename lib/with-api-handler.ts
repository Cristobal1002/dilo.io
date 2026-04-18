/**
 * lib/with-api-handler.ts
 * Higher-order function that wraps API route handlers with:
 *   - Centralized error handling
 *   - Automatic logging of request context
 *   - Optional auth resolution
 *
 * Usage (authenticated route):
 *   export const POST = withApiHandler(async (req, { auth }) => {
 *     const { org } = auth  // already resolved
 *     ...
 *     return apiCreated(result)
 *   }, { requireAuth: true })
 *
 * Usage (public route):
 *   export const GET = withApiHandler(async (req) => {
 *     return apiSuccess(data)
 *   })
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, type AuthContext } from './auth'
import { handleApiError } from './api-response'
import { createLogger } from './logger'

const log = createLogger('api-handler')

type HandlerContext = {
  auth: AuthContext
  params: Record<string, string>
}

type PublicHandlerContext = {
  auth?: never
  params: Record<string, string>
}

type Options = {
  requireAuth?: boolean
}

export function withApiHandler(
  handler: (req: NextRequest, ctx: HandlerContext) => Promise<NextResponse>,
  options?: { requireAuth: true }
): (req: NextRequest, segmentCtx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

export function withApiHandler(
  handler: (req: NextRequest, ctx: PublicHandlerContext) => Promise<NextResponse>,
  options?: { requireAuth?: false }
): (req: NextRequest, segmentCtx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

export function withApiHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextRequest, ctx: any) => Promise<NextResponse>,
  options: Options = {},
) {
  return async (
    req: NextRequest,
    segmentCtx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const start = Date.now()
    const params = await segmentCtx.params

    log.debug(
      { method: req.method, url: req.url, params },
      'Incoming request'
    )

    try {
      let auth: AuthContext | undefined

      if (options.requireAuth !== false) {
        auth = await getAuthContext()
      }

      const response = await handler(req, { auth: auth as AuthContext, params })

      log.debug(
        { method: req.method, url: req.url, status: response.status, ms: Date.now() - start },
        'Request completed'
      )

      return response
    } catch (err) {
      return handleApiError(err, `${req.method} ${req.url}`)
    }
  }
}
