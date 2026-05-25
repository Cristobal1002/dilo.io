import { NextRequest } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { acceptInvitationByToken } from '@/lib/team-invitations'
import { UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors'
import { apiSuccess } from '@/lib/api-response'
import { withApiHandler } from '@/lib/with-api-handler'

export const POST = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const clerkUser = await currentUser()
    if (!clerkUser?.id) throw new UnauthorizedError()

    const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null

    try {
      const result = await acceptInvitationByToken(params.token, clerkUser.id, email, name)
      if (!result) throw new NotFoundError('Invitación')
      return apiSuccess(result)
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_MISMATCH') {
        throw new ValidationError(
          'Esta invitación es para otro correo. Inicia sesión con el email al que llegó la invitación.',
        )
      }
      throw err
    }
  },
  { requireAuth: true },
)
