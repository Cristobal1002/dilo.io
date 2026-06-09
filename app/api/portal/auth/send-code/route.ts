import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { issuePortalLoginCode } from '@/lib/portal-login-codes'
import { handleApiError } from '@/lib/api-response'

const Body = z.object({
  email: z.string().email(),
  invite: z.string().min(8).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) throw new ValidationError('Datos inválidos')

    const result = await issuePortalLoginCode({
      email: parsed.data.email,
      inviteToken: parsed.data.invite,
    })

    return apiSuccess({
      sent: result.sent,
      entrarUrl: result.entrarUrl,
      message: 'Te enviamos un código de 6 dígitos a tu correo.',
    })
  } catch (err) {
    return handleApiError(err, 'POST /api/portal/auth/send-code')
  }
}
