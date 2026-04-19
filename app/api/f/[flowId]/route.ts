import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'

const flowIdSchema = z.string().uuid()

/**
 * Definición pública de un flow publicado (sin auth).
 * Solo `status = published`; borradores responden 404.
 */
export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const { flowId } = params
    if (!flowIdSchema.safeParse(flowId).success) {
      throw new NotFoundError('Flow')
    }
    const { flow, steps } = await loadPublishedFlowWithSteps(flowId)
    return apiSuccess({ flow, steps })
  },
  { requireAuth: false },
)
