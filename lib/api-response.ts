/**
 * lib/api-response.ts
 * Standard API response shapes for all routes in Dilo.
 *
 * Every response follows one of two shapes:
 *
 * Success:
 *   { success: true, data: T }
 *
 * Error:
 *   { success: false, error: { code: string, message: string, details?: unknown } }
 *
 * This consistency lets the client always check `response.success` and branch cleanly,
 * and makes error handling in the frontend a single utility function.
 */
import { NextResponse } from 'next/server'
import { upstreamErrorFromAiSdk, configurationErrorFromUnknown } from './ai-api-errors'
import { AppError, isAppError, InternalError } from './errors'
import { createLogger } from './logger'

const log = createLogger('api-response')

// ─── Response builders ────────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiCreated<T>(data: T): NextResponse {
  return apiSuccess(data, 201)
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function apiError(error: AppError): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
    },
    { status: error.statusCode }
  )
}

// ─── Central error handler ────────────────────────────────────────────────────
/**
 * Converts any thrown value into a standardized API error response.
 * Log unexpected errors with full context for debugging.
 */
export function handleApiError(err: unknown, context?: string): NextResponse {
  if (isAppError(err)) {
    // Known errors: log at warn level (no stack trace needed)
    if (err.statusCode >= 500) {
      log.error({ err, context }, err.message)
    } else {
      log.warn({ code: err.code, context }, err.message)
    }
    return apiError(err)
  }

  const configErr = configurationErrorFromUnknown(err)
  if (configErr) {
    log.warn({ code: configErr.code, context }, configErr.message)
    return apiError(configErr)
  }

  const upstream = upstreamErrorFromAiSdk(err)
  if (upstream) {
    log.warn({ code: upstream.code, context, cause: err }, upstream.message)
    return apiError(upstream)
  }

  // Unknown errors: log full details
  log.error({ err, context }, 'Unhandled error in API route')
  return apiError(new InternalError())
}
