import { NextRequest } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { acceptClientInvitationByToken } from '@/lib/client-invitations'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError, UnauthorizedError } from '@/lib/errors'
import { withApiHandler } from '@/lib/with-api-handler'

export const POST = withApiHandler(async (_req: NextRequest, { params }) => {
  const clerkUser = await currentUser()
  if (!clerkUser?.id) throw new UnauthorizedError()

  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

  try {
    const result = await acceptClientInvitationByToken(
      params.token,
      clerkUser.id,
      email,
      name,
    )
    if (!result) throw new NotFoundError('Invitación')
    return apiSuccess(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_MISMATCH') {
      throw new ValidationError('Debes iniciar sesión con el correo de la invitación')
    }
    throw err
  }
}, { requireAuth: true })
