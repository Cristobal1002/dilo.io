import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiSuccess, handleApiError } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { verifyPortalLoginCode } from '@/lib/portal-login-codes'
import {
  createPortalSessionToken,
  portalSessionCookieOptions,
} from '@/lib/portal-session'
import { PORTAL_SESSION_COOKIE } from '@/lib/portal-constants'

const Body = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  invite: z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) throw new ValidationError('Datos inválidos')

    const { email } = await verifyPortalLoginCode({
      email: parsed.data.email,
      code: parsed.data.code,
      inviteToken: parsed.data.invite,
    })

    const token = createPortalSessionToken(email)
    const response = apiSuccess({ ok: true, redirectTo: '/portal' })
    response.cookies.set(PORTAL_SESSION_COOKIE, token, portalSessionCookieOptions())
    return response
  } catch (err) {
    return handleApiError(err, 'POST /api/portal/auth/verify-code')
  }
}
