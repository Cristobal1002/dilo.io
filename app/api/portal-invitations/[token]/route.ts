import { NextRequest } from 'next/server'
import { getClientInvitationPreview } from '@/lib/client-invitations'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { withApiHandler } from '@/lib/with-api-handler'

export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const preview = await getClientInvitationPreview(params.token)
    if (!preview) throw new NotFoundError('Invitación')
    return apiSuccess(preview)
  },
  { requireAuth: false },
)
